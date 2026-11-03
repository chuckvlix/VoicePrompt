import logging
from fastapi import APIRouter, HTTPException, status
from app.database import get_db_connection
from app.schemas import HistoryCreateRequest, HistoryDeleteResponse, HistoryItemResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["History"])


def format_created_at(val: str | None) -> str:
    if not val:
        return ""
    s = str(val).strip()
    if "T" in s:
        return s if (s.endswith("Z") or "+" in s) else f"{s}Z"
    return f"{s.replace(' ', 'T')}Z"


@router.get("", response_model=list[HistoryItemResponse])
def get_history() -> list[HistoryItemResponse]:
    """
    Retrieve all saved history items ordered by most recent first.
    """
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            SELECT id, original_text, improved_text, tone, created_at
            FROM history
            ORDER BY id DESC
            """
        )
        rows = cursor.fetchall()
        return [
            HistoryItemResponse(
                id=row["id"],
                original_text=row["original_text"],
                improved_text=row["improved_text"],
                tone=row["tone"],
                created_at=format_created_at(row["created_at"]),
            )
            for row in rows
        ]


@router.post("", response_model=HistoryItemResponse, status_code=status.HTTP_201_CREATED)
def create_history_item(payload: HistoryCreateRequest) -> HistoryItemResponse:
    """
    Persist an original and improved pair to the history database.
    """
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO history (original_text, improved_text, tone)
            VALUES (?, ?, ?)
            """,
            (payload.original_text, payload.improved_text, payload.tone),
        )
        conn.commit()
        item_id = cursor.lastrowid

        # Fetch the newly inserted record with its generated created_at
        cursor = conn.execute(
            """
            SELECT id, original_text, improved_text, tone, created_at
            FROM history
            WHERE id = ?
            """,
            (item_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_500,
                detail="Error al recuperar el elemento recién guardado.",
            )

        return HistoryItemResponse(
            id=row["id"],
            original_text=row["original_text"],
            improved_text=row["improved_text"],
            tone=row["tone"],
            created_at=format_created_at(row["created_at"]),
        )


@router.delete("/{item_id}", response_model=HistoryDeleteResponse)
def delete_history_item(item_id: int) -> HistoryDeleteResponse:
    """
    Delete a saved history item by ID.
    """
    with get_db_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM history WHERE id = ?",
            (item_id,),
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró ningún elemento del historial con id {item_id}.",
            )

        return HistoryDeleteResponse(
            message="Elemento eliminado correctamente.",
            id=item_id,
        )
