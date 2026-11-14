from pydantic import BaseModel, ConfigDict, ValidationError
from typing import Any, Optional

class BaseGolfModel(BaseModel):
    model_config = ConfigDict(validate_assignment=True, json_schema_serialization_defaults_required=True)

    def update_field(self, field_name: str, value: Any) -> Optional[str]:
        try:
            setattr(self, field_name, value)
            return None
        except ValidationError as e:
            return e.errors()[0]['msg']