from pydantic import BaseModel, ConfigDict, ValidationError
from typing import Any, Optional

class BaseGolfModel(BaseModel):
    """Shared configuration and methods."""
    # A field with a default is always present in a response, so the API schema marks it required.
    model_config = ConfigDict(validate_assignment=True, json_schema_serialization_defaults_required=True)

    def update_field(self, field_name: str, value: Any) -> Optional[str]:
        """Update a field with user correction. Returns error message if validation fails."""
        try:
            setattr(self, field_name, value)
            return None
        except ValidationError as e:
            return e.errors()[0]['msg']