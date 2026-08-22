# LMS Architecture Document

## Project Structure

The project is structured as a decoupled web application comprising:
1.  **FastAPI Backend (`server/`)**: Provides REST endpoints using a vertical slice architecture.
2.  **Angular Frontend (`client/`)**: Consists of modular standalone components with state management via Angular Signals.

### Folder Layout

```text
lms/
├── client/                     # Angular frontend application
│   └── src/app/
│       ├── core/               # App-wide guards, models, services, interceptors
│       ├── features/           # Feature-specific components
│       └── app.routes.ts       # Global routing definition
├── server/                     # FastAPI backend application
│   ├── core/                   # Central configuration, database, main routes
│   └── modules/                # Feature vertical slices (e.g., users, payroll)
│       └── payroll/            # Payroll vertical slice (models, router, schemas)
└── .specify/                   # Feature specifications and planning documents
```

## Modular Separation (Vertical Slice)

Each backend module in `server/modules/` is self-contained and encapsulates:
-   **Models (`models.py`)**: SQLAlchemy ORM definitions mapping to SQLite tables.
-   **Schemas (`schemas.py`)**: Pydantic v2 data transfer objects.
-   **Router (`router.py`)**: REST endpoints containing the business logic and route gating dependencies.
