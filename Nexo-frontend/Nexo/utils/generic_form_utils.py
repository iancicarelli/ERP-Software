import reflex as rx
from typing import Any, List, Dict, Type, Optional
from pydantic import BaseModel

# --- ESTILOS ---
LABEL_STYLE = {
    "size": "2",
    "weight": "bold",
    "color": "black", 
    "margin_bottom": "4px",
}

INPUT_STYLE = {
    "height": "40px", 
    "width": "100%",
    "variant": "surface",
    "color_scheme": "gray",
}

SELECT_STYLE = {
    "height": "40px", 
    "width": "100%",
    "variant": "soft",
    "color_scheme": "gray",
    "radius": "medium",
}


def normalize_bool(value: Any) -> bool | rx.Var[bool]:
    if isinstance(value, rx.Var):
        return rx.cond(value.is_none(), False, value)
    if value in (1, "1", True):
        return True
    return False

def normalize_value(value: Any) -> rx.Var[str] | str:
    if isinstance(value, rx.Var):
        return rx.cond(value.is_none(), "", value.to(str))
    if value is None:
        return ""
    return str(value)

def smart_group_fields(fields: List[Dict], boolean_columns: int = 3) -> List[Dict]:
    booleans = [f for f in fields if f.get("type") == "boolean"]
    non_booleans = [f for f in fields if f.get("type") != "boolean"]

    result = []
    bool_index = 0

    for field in non_booleans:
        result.append(field)

        if bool_index < len(booleans):
            chunk = booleans[bool_index: bool_index + boolean_columns]
            result.append({
                "type": "boolean_group",
                "fields": chunk,
            })
            bool_index += boolean_columns

    if bool_index < len(booleans):
        result.append({
            "type": "boolean_group",
            "fields": booleans[bool_index:],
        })

    return result


def generate_auto_fields(
    dto_class: Type[BaseModel], 
    exclude: Optional[List[str]] = None, 
    overrides: Optional[Dict[str, Dict]] = None
) -> List[Dict]:

    if exclude is None: exclude = []
    if overrides is None: overrides = {}
    
    fields_config = []
    if hasattr(dto_class, "model_fields"):
        fields_dict = dto_class.model_fields
    else:
        fields_dict = getattr(dto_class, "__fields__", {})

    for name, info in fields_dict.items():
        if name in exclude or name.startswith("_") or name == "id":
            continue

        annotation = getattr(info, "annotation", None)
        if annotation is None:
            annotation = getattr(info, "type_", str)

        field_type = "text"

        annotation_str = str(annotation).lower()
        
        if "int" in annotation_str or "float" in annotation_str:
            field_type = "number"
        elif "bool" in annotation_str:
            field_type = "boolean"

        field_def = {
            "key": name,
            "label": name.replace("_", " ").capitalize(),
            "type": field_type
        }
        if name in overrides:
            field_def.update(overrides[name])

        fields_config.append(field_def)

    return fields_config


def inject_options(fields: list[dict], overrides: dict) -> list[dict]:
    result = []
    for f in fields:
        field = f.copy()
        if field.get("type") == "select" and field["key"] in overrides:
            field["options"] = overrides[field["key"]]
        result.append(field)
    return result