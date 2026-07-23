import reflex as rx
from typing import Any, Optional, Dict
from ...states.api.api_state import APIState
from ...config.settings import API_BASE_URL


class GenericDetailState(APIState):
    loading: bool = False
    error: Optional[str] = None
    is_saving: bool = False

    def get_entity_name(self) -> str:
        raise NotImplementedError

    def get_dto_class(self) -> Any:
        raise NotImplementedError

    def get_endpoint(self) -> str:
        raise NotImplementedError

    def hook_pre_update(self, field: str, value: Any) -> Any:
        return value

    def hook_post_update(self, field: str, value: Any):
        pass

    def hook_process_data(self, data: Dict) -> Dict:
        return data

    def _parse_error_response(self, response) -> str:
        try:
            error_detail = response.json()
            if isinstance(error_detail, dict):
                msgs = []
                for campo, errores in error_detail.items():
                    if isinstance(errores, list):
                        sep = ", "
                        msgs.append(f"{campo}: {sep.join(str(e) for e in errores)}")
                    else:
                        msgs.append(f"{campo}: {errores}")
                return " | ".join(msgs) if msgs else f"Error {response.status_code}"
            return str(error_detail)
        except Exception:
            return f"Error {response.status_code}"

    def _update_field(self, field: str, value: Any):
        entity_name = self.get_entity_name()
        entity = getattr(self, entity_name)
        if not entity:
            return

        value = self.hook_pre_update(field, value)

        dto_class = self.get_dto_class()
        if hasattr(dto_class, "model_fields"):
            field_info = dto_class.model_fields.get(field)
        else:
            field_info = getattr(dto_class, "__fields__", {}).get(field)

        if field_info:
            annotation = str(getattr(field_info, "annotation", "")).lower()
            if ("int" in annotation or "float" in annotation) and value == "":
                value = 0

        setattr(entity, field, value)
        self.hook_post_update(field, value)
        setattr(self, entity_name, entity)

    def _update_value(self, field: str, value: Any):
        entity_name = self.get_entity_name()
        entity = getattr(self, entity_name)

        if not entity:
            return

        value = self.hook_pre_update(field, value)

        dto_class = self.get_dto_class()

        if hasattr(dto_class, "model_fields"):
            field_info = dto_class.model_fields.get(field)
        else:
            field_info = getattr(dto_class, "__fields__", {}).get(field)

        if not field_info:
            return

        annotation = str(getattr(field_info, "annotation", "")).lower()

        try:
            if "int" in annotation:
                value = int(value) if value not in ("", None) else 0
            elif "float" in annotation:
                value = float(value) if value not in ("", None) else 0.0
        except (ValueError, TypeError):
            value = 0

        setattr(entity, field, value)
        self.hook_post_update(field, value)
        setattr(self, entity_name, entity)

    def _toggle_bool(self, field: str, value: bool):
        entity_name = self.get_entity_name()
        entity = getattr(self, entity_name)
        if not entity:
            return
        setattr(entity, field, value)
        setattr(self, entity_name, entity)

    async def _load_by_id(self, entity_id: Any):
        self.loading = True
        self.error = None
        entity_name = self.get_entity_name()
        setattr(self, entity_name, None)

        try:
            url = f"{API_BASE_URL}{self.get_endpoint()}{entity_id}/"
            response = await self.fetch_with_auth(
                url=url,
                method="GET",
                params={"format": "json"}
            )

            if not response:
                self.error = "Error de conexión con el servidor."
                self.loading = False
                return

            if response.status_code == 200:
                data = response.json()
                data = self.hook_process_data(data)
                dto_instance = self.get_dto_class()(**data)
                setattr(self, entity_name, dto_instance)

            elif response.status_code == 401:
                self.error = "Sesión expirada."
                return self.logout()
            else:
                self.error = f"Error {response.status_code} al cargar."
                print(f"Error de API: {response.text}")

        except Exception as e:
            self.error = f"Error al procesar los datos: {e}"
            print(f"Excepción en carga: {e}")
            setattr(self, entity_name, None)

        finally:
            self.loading = False