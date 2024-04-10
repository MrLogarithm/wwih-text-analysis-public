class AttrDict(dict):
    """
    Dictionary which allows accessing keys via . notation
    instead of [] notation. Allows for cleaner code and
    greater similarity between the JS and python portions
    of this application.
    """
    def __getitem__(self, key):
        try:
            value = super().__getitem__(key)
            if isinstance(value, dict):
                value = AttrDict(value)
            return value
        except KeyError:
            return None

    def __getattr__(self, key):
        value = self[key]
        if isinstance(value, dict):
            value = AttrDict(value)
        return value
