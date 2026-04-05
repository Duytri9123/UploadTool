#!/usr/bin/env python3
"""YouTube uploader using OAuth 2.0"""
import os
import pickle
import json
from pathlib import Path
from typing import Optional, Dict, Any
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import googleapiclient.discovery
import googleapiclient.errors

# Scopes for YouTube API
SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
]

class YouTubeUploader:
    """Upload videos to YouTube using OAuth 2.0."""
    
    def __init__(self, client_secrets_file: str = "client_secrets.json", tokens_dir: str = ".youtube_tokens"):
        self.client_secrets_file = Path(client_secrets_file)
        self.tokens_dir = Path(tokens_dir)
        self.tokens_dir.mkdir(exist_ok=True)
        self.token_file = self.tokens_dir / "youtube_token.pickle"
        self.credentials = None
        self.youtube = None
        self.last_error = ""
        self._pending_flow = None
        self._pending_state = ""
    
    def _load_credentials(self) -> Optional[Credentials]:
        """Load saved credentials from file."""
        if self.token_file.exists():
            with open(self.token_file, 'rb') as f:
                return pickle.load(f)
        return None
    
    def _save_credentials(self, credentials: Credentials):
        """Save credentials to file."""
        with open(self.token_file, 'wb') as f:
            pickle.dump(credentials, f)
    
    def authenticate(self, force_refresh: bool = False) -> bool:
        """
        Authenticate with YouTube API.
        Returns True if successful.
        """
        try:
            self.last_error = ""
            # Try loading saved credentials
            if force_refresh:
                # force_refresh is handled by revoke + OAuth URL flow from API layer.
                return False

            self.credentials = self._load_credentials()
            if self.credentials and self.credentials.valid:
                self.youtube = googleapiclient.discovery.build(
                    'youtube', 'v3', credentials=self.credentials
                )
                return True

            # Refresh if expired
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                self.credentials.refresh(Request())
                self._save_credentials(self.credentials)
                self.youtube = googleapiclient.discovery.build(
                    'youtube', 'v3', credentials=self.credentials
                )
                return True

            return False
        
        except Exception as e:
            self.last_error = str(e)
            print(f"Authentication error: {e}")
            return False
    
    def get_auth_url(self) -> Optional[str]:
        """
        Get OAuth authorization URL for manual auth.
        Returns the URL user should visit.
        """
        try:
            self.last_error = ""
            if not self.client_secrets_file.exists():
                self.last_error = f"client_secrets.json not found at {self.client_secrets_file}"
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(self.client_secrets_file),
                SCOPES,
                redirect_uri='http://localhost:8080/oauth2callback'
            )
            
            auth_url, state = flow.authorization_url(access_type='offline', prompt='consent')
            self._pending_flow = flow
            self._pending_state = str(state or "")
            return auth_url
        except Exception as e:
            self.last_error = str(e)
            print(f"Error getting auth URL: {e}")
            return None

    def complete_auth_callback(self, callback_url: str, state: str = "") -> bool:
        """Exchange OAuth callback code for tokens."""
        try:
            self.last_error = ""
            if not self._pending_flow:
                self.last_error = "OAuth state expired. Please click Đăng nhập YouTube again."
                return False

            if self._pending_state and state and self._pending_state != str(state):
                self.last_error = "OAuth state mismatch"
                return False

            self._pending_flow.fetch_token(authorization_response=callback_url)
            self.credentials = self._pending_flow.credentials
            if not self.credentials:
                self.last_error = "Failed to obtain OAuth credentials"
                return False

            self._save_credentials(self.credentials)
            self.youtube = googleapiclient.discovery.build('youtube', 'v3', credentials=self.credentials)
            self._pending_flow = None
            self._pending_state = ""
            return True
        except Exception as e:
            self.last_error = str(e)
            print(f"Error completing auth callback: {e}")
            return False
    
    def upload_video(
        self,
        video_path: Path,
        title: str,
        description: str = "",
        tags: list = None,
        category_id: str = "22",  # 22 = People & Blogs
        privacy_status: str = "private",  # private, unlisted, public
        on_progress: callable = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Upload video to YouTube.
        
        Args:
            video_path: Path to video file
            title: Video title
            description: Video description
            tags: List of video tags
            category_id: YouTube category ID
            privacy_status: 'private', 'unlisted', or 'public'
            on_progress: Callback function(status, pct) for progress tracking
        
        Returns:
            Video info dict with 'id', 'url', etc. on success, None on failure
        """
        if not self.youtube:
            raise RuntimeError("Not authenticated. Call authenticate() first.")
        
        try:
            video_path = Path(video_path)
            if not video_path.exists():
                raise FileNotFoundError(f"Video file not found: {video_path}")
            
            file_size = video_path.stat().st_size
            
            # Build request body
            body = {
                'snippet': {
                    'title': title[:100],  # YouTube limit
                    'description': description[:5000],
                    'tags': tags or [],
                    'categoryId': category_id,
                    'defaultLanguage': 'vi',
                },
                'status': {
                    'privacyStatus': privacy_status,
                    'embeddable': True,
                    'publicStatsViewable': True,
                },
            }
            
            # Create resumable upload
            request = self.youtube.videos().insert(
                part='snippet,status',
                body=body,
                media_body=googleapiclient.http.MediaFileUpload(
                    str(video_path),
                    chunksize=1024 * 1024,  # 1MB chunks
                    resumable=True,
                    mimetype='video/mp4'
                )
            )
            
            # Execute with progress tracking
            response = None
            percent_complete = 0
            
            while response is None:
                try:
                    status, response = request.next_chunk()
                    if status:
                        percent_complete = int(status.progress() * 100)
                        if on_progress:
                            on_progress({'status': 'uploading', 'pct': percent_complete})
                except googleapiclient.errors.HttpError as e:
                    if on_progress:
                        on_progress({'status': 'error', 'message': str(e)})
                    raise RuntimeError(f"Upload failed: {e}")
            
            if on_progress:
                on_progress({'status': 'success', 'pct': 100})
            
            video_id = response['id']
            return {
                'id': video_id,
                'url': f'https://youtu.be/{video_id}',
                'title': title,
                'status': privacy_status,
            }
        
        except Exception as e:
            if on_progress:
                on_progress({'status': 'error', 'message': str(e)})
            raise

    def get_channel_info(self) -> Optional[Dict[str, Any]]:
        """Get authenticated channel info."""
        if not self.youtube:
            return None
        
        try:
            request = self.youtube.channels().list(
                part='snippet,statistics',
                mine=True
            )
            response = request.execute()
            if response['items']:
                ch = response['items'][0]
                return {
                    'id': ch['id'],
                    'title': ch['snippet']['title'],
                    'description': ch['snippet']['description'],
                    'subscribers': ch['statistics'].get('subscriberCount', 'hidden'),
                    'video_count': ch['statistics'].get('videoCount', '0'),
                }
        except Exception as e:
            print(f"Error getting channel info: {e}")
        
        return None

    def revoke_auth(self) -> bool:
        """Revoke OAuth token and delete saved credentials."""
        try:
            if self.token_file.exists():
                self.token_file.unlink()
            self.credentials = None
            self.youtube = None
            return True
        except Exception as e:
            print(f"Error revoking auth: {e}")
            return False
