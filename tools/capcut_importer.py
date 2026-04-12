#!/usr/bin/env python3
"""
capcut_importer.py — Tự động import video MP4 và SRT vào CapCut

Hỗ trợ:
  - Copy video + subtitle vào thư mục draft của CapCut
  - Tạo project metadata cho CapCut
  - Tự động mở CapCut với project mới (optional)
"""
import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class CapCutImporter:
    """Import video và subtitle vào CapCut draft folder."""
    
    # Đường dẫn mặc định của CapCut trên Windows
    CAPCUT_PATHS = [
        Path.home() / "AppData" / "Local" / "CapCut" / "User Data",
        Path.home() / "Documents" / "CapCut",
        Path("C:/Program Files/CapCut"),
    ]
    
    def __init__(self, capcut_path: Optional[str] = None):
        """
        Args:
            capcut_path: Đường dẫn tùy chỉnh đến thư mục CapCut (optional)
        """
        self.capcut_path = self._find_capcut_path(capcut_path)
        if self.capcut_path:
            logger.info(f"CapCut path found: {self.capcut_path}")
        else:
            logger.warning("CapCut installation not found")
    
    def _find_capcut_path(self, custom_path: Optional[str] = None) -> Optional[Path]:
        """Tìm đường dẫn cài đặt CapCut."""
        if custom_path:
            p = Path(custom_path)
            if p.exists():
                return p
        
        for path in self.CAPCUT_PATHS:
            if path.exists():
                return path
        
        return None
    
    def import_video(
        self,
        video_path: Path,
        srt_path: Optional[Path] = None,
        project_name: Optional[str] = None,
        auto_open: bool = False,
    ) -> Dict[str, Any]:
        """
        Import video và subtitle vào CapCut.
        
        Args:
            video_path: Đường dẫn file video MP4
            srt_path: Đường dẫn file SRT (optional)
            project_name: Tên project (mặc định dùng tên file)
            auto_open: Tự động mở CapCut sau khi import
        
        Returns:
            Dict chứa thông tin import: {
                "success": bool,
                "project_id": str,
                "draft_path": Path,
                "message": str
            }
        """
        if not self.capcut_path:
            return {
                "success": False,
                "message": "CapCut not found. Please install CapCut or set custom path."
            }
        
        video_path = Path(video_path)
        if not video_path.exists():
            return {
                "success": False,
                "message": f"Video file not found: {video_path}"
            }
        
        # Tạo project ID và tên
        project_id = str(uuid.uuid4())
        if not project_name:
            project_name = video_path.stem
        
        # Tạo thư mục draft đúng chuẩn cho bản PC
        root_proj = self.capcut_path / "Projects" / "com.lveditor.draft"
        if not root_proj.exists():
            root_proj = self.capcut_path / "Drafts"
            
        draft_folder = root_proj / f"{project_name}_{project_id[:8]}"
        draft_folder.mkdir(parents=True, exist_ok=True)
        
        try:
            # Copy video vào draft folder
            video_dest = draft_folder / video_path.name
            shutil.copy2(video_path, video_dest)
            logger.info(f"Copied video to: {video_dest}")
            
            # Copy SRT nếu có
            srt_dest = None
            if srt_path and Path(srt_path).exists():
                srt_dest = draft_folder / Path(srt_path).name
                shutil.copy2(srt_path, srt_dest)
                logger.info(f"Copied subtitle to: {srt_dest}")
            
            # Tạo metadata cho CapCut project
            metadata = self._create_project_metadata(
                project_id=project_id,
                project_name=project_name,
                video_path=video_dest,
                srt_path=srt_dest,
            )
            
            # Lưu metadata draft_content
            metadata_path = draft_folder / "draft_content.json"
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            # Lưu draft_meta_info (rất quan trọng trên PC)
            import time
            ts = int(time.time() * 1000000)
            meta_info = {
                "draft_id": project_id,
                "draft_name": project_name,
                "draft_fold_path": str(draft_folder).replace("\\", "/"),
                "draft_root_path": str(root_proj).replace("\\", "/"),
                "draft_json_file": str(metadata_path).replace("\\", "/"),
                "draft_new_version": "163.0.0",
                "draft_materials": [],
                "tm_draft_create": ts,
                "tm_draft_modified": ts,
            }
            with open(draft_folder / "draft_meta_info.json", "w", encoding="utf-8") as f:
                json.dump(meta_info, f, ensure_ascii=False)
                
            # Đăng ký vào root_meta_info.json để CapCut tìm thấy
            root_meta = root_proj / "root_meta_info.json"
            if root_meta.exists():
                try:
                    with open(root_meta, "r", encoding="utf-8") as f:
                        rdata = json.load(f)
                    if "all_draft_store" not in rdata:
                        rdata["all_draft_store"] = []
                    rdata["all_draft_store"].insert(0, meta_info)
                    with open(root_meta, "w", encoding="utf-8") as f:
                        json.dump(rdata, f, ensure_ascii=False)
                except Exception as e:
                    logger.warning(f"Failed to update root_meta_info.json: {e}")
            
            logger.info(f"Created CapCut project: {project_name} ({project_id})")
            
            # Tự động mở CapCut (optional)
            if auto_open:
                self._open_capcut(draft_folder)
            
            return {
                "success": True,
                "project_id": project_id,
                "project_name": project_name,
                "draft_path": draft_folder,
                "video_path": video_dest,
                "srt_path": srt_dest,
                "message": f"Successfully imported to CapCut: {project_name}"
            }
        
        except Exception as e:
            logger.error(f"Failed to import to CapCut: {e}")
            return {
                "success": False,
                "message": f"Import failed: {str(e)}"
            }
    
    def _create_project_metadata(
        self,
        project_id: str,
        project_name: str,
        video_path: Path,
        srt_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """Tạo metadata JSON cho CapCut project."""
        metadata = {
            "id": project_id,
            "name": project_name,
            "version": "1.0.0",
            "materials": {
                "videos": [
                    {
                        "id": str(uuid.uuid4()),
                        "path": str(video_path),
                        "name": video_path.name,
                        "type": "video",
                    }
                ],
            },
            "tracks": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "video",
                    "segments": [
                        {
                            "id": str(uuid.uuid4()),
                            "material_id": str(uuid.uuid4()),
                            "target_timerange": {"start": 0, "duration": 0},
                        }
                    ],
                }
            ],
        }
        
        # Thêm subtitle track nếu có SRT
        if srt_path:
            metadata["materials"]["subtitles"] = [
                {
                    "id": str(uuid.uuid4()),
                    "path": str(srt_path),
                    "name": srt_path.name,
                    "type": "subtitle",
                }
            ]
            metadata["tracks"].append({
                "id": str(uuid.uuid4()),
                "type": "subtitle",
                "segments": [
                    {
                        "id": str(uuid.uuid4()),
                        "material_id": str(uuid.uuid4()),
                    }
                ],
            })
        
        return metadata
    
    def _open_capcut(self, draft_folder: Path) -> bool:
        """Mở CapCut với project đã tạo."""
        try:
            import subprocess
            import sys
            
            # Tìm CapCut executable
            capcut_exe = None
            possible_exes = [
                Path("C:/Program Files/CapCut/CapCut.exe"),
                Path.home() / "AppData" / "Local" / "CapCut" / "CapCut.exe",
            ]
            
            for exe in possible_exes:
                if exe.exists():
                    capcut_exe = exe
                    break
            
            if not capcut_exe:
                logger.warning("CapCut executable not found")
                return False
            
            # Mở CapCut
            if sys.platform == "win32":
                subprocess.Popen([str(capcut_exe)], shell=True)
            else:
                subprocess.Popen([str(capcut_exe)])
            
            logger.info("Opened CapCut")
            return True
        
        except Exception as e:
            logger.error(f"Failed to open CapCut: {e}")
            return False
    
    def list_drafts(self) -> list[Dict[str, Any]]:
        """Liệt kê tất cả draft projects trong CapCut."""
        if not self.capcut_path:
            return []
        
        drafts_folder = self.capcut_path / "Drafts"
        if not drafts_folder.exists():
            return []
        
        drafts = []
        for draft_dir in drafts_folder.iterdir():
            if not draft_dir.is_dir():
                continue
            
            metadata_path = draft_dir / "draft_content.json"
            if metadata_path.exists():
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        metadata = json.load(f)
                    drafts.append({
                        "id": metadata.get("id"),
                        "name": metadata.get("name"),
                        "path": draft_dir,
                    })
                except Exception as e:
                    logger.warning(f"Failed to read draft metadata: {e}")
        
        return drafts
