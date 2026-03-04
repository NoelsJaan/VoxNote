from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    OPENAI_API_KEY: str
    UPLOAD_DIR: str = "/uploads"
    MAX_UPLOAD_SIZE_MB: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
