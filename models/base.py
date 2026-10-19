from copy import deepcopy
from pydantic import BaseModel, ConfigDict, PrivateAttr, ValidationError
from typing import Any, Optional

class BaseGolfModel(BaseModel):
    """Shared configuration and methods."""
    model_config = ConfigDict(validate_assignment=True)
    _revision: int = PrivateAttr(default=0)
    _field_revisions: dict[str, int] = PrivateAttr(default_factory=dict)

    def __setattr__(self, name: str, value: Any) -> None:
        if name in type(self).model_fields and hasattr(self, '__pydantic_fields_set__'):
            self._apply_updates({name: value})
        else:
            super().__setattr__(name, value)

    def _apply_updates(self, values: dict[str, Any]) -> None:
        """Validate an isolated candidate before changing this instance at all."""
        unknown = values.keys() - type(self).model_fields.keys()
        if unknown:
            raise ValueError(f"Unknown field: {sorted(unknown)[0]}")
        payload = {name: getattr(self, name) for name in type(self).model_fields}
        payload.update(values)
        candidate = type(self).model_validate(deepcopy(payload))
        # Preserve unchanged child identities and private freshness tracking.
        for name in type(self).model_fields:
            if name not in values and getattr(candidate, name) == getattr(self, name):
                candidate.__dict__[name] = getattr(self, name)
        object.__setattr__(self, '__dict__', candidate.__dict__)
        self.__pydantic_fields_set__.update(values)
        self._revision += 1
        for name in values:
            self._field_revisions[name] = self._field_revisions.get(name, 0) + 1
        self._fields_updated(set(values))

    def _fields_updated(self, fields: set[str]) -> None:
        """Hook for recording the provenance of successfully supplied summaries."""

    def update_fields(self, **values: Any) -> Optional[str]:
        """Apply coordinated corrections atomically; return an error on rejection."""
        try:
            self._apply_updates(values)
            return None
        except ValidationError as error:
            return error.errors()[0]['msg']
        except ValueError as error:
            return str(error)

    def update_field(self, field_name: str, value: Any) -> Optional[str]:
        """Update a field with user correction. Returns error message if validation fails."""
        return self.update_fields(**{field_name: value})
