import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


PathLike = Union[str, Path]


class JsonStore:
    @staticmethod
    def load_json(path: PathLike) -> List[Dict[str, Any]]:
        file_path = Path(path)
        if not file_path.exists():
            return []
        with file_path.open("r", encoding="utf-8") as file_obj:
            return json.load(file_obj)

    @staticmethod
    def save_json(path: PathLike, data: List[Dict[str, Any]]) -> None:
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("w", encoding="utf-8") as file_obj:
            json.dump(data, file_obj, indent=2)

    @classmethod
    def create_record(cls, path: PathLike, record: Dict[str, Any], key: str = "id") -> Dict[str, Any]:
        rows = cls.load_json(path)
        if key in record and any(item.get(key) == record[key] for item in rows):
            raise ValueError(f"Record with {key}={record[key]} already exists")
        rows.append(record)
        cls.save_json(path, rows)
        return record

    @classmethod
    def get_record(cls, path: PathLike, key: str, value: Any) -> Optional[Dict[str, Any]]:
        rows = cls.load_json(path)
        for item in rows:
            if item.get(key) == value:
                return item
        return None

    @classmethod
    def update_record(cls, path: PathLike, key: str, value: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rows = cls.load_json(path)
        for index, item in enumerate(rows):
            if item.get(key) == value:
                rows[index] = {**item, **updates}
                cls.save_json(path, rows)
                return rows[index]
        return None

    @classmethod
    def delete_record(cls, path: PathLike, key: str, value: Any) -> bool:
        rows = cls.load_json(path)
        filtered = [item for item in rows if item.get(key) != value]
        if len(filtered) == len(rows):
            return False
        cls.save_json(path, filtered)
        return True