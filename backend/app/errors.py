class AppError(Exception):
    """Error de negocio con codigo HTTP y mensaje para el cliente."""

    def __init__(self, status_code: int = 400, detail: str = "Error de negocio."):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)