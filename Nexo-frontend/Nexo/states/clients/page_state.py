import reflex as rx
import math
from ..api.api_state import APIState

class PaginatedState(APIState):
    page: int = 1
    page_size: int = 10
    total_count: int = 0
    _has_more: bool = False

    @rx.var
    def can_prev(self) -> bool:
        return self.page > 1

    @rx.var
    def can_next(self) -> bool:
        return self._has_more

    @rx.var
    def total_pages(self) -> int:
        if self.total_count == 0:
            return 1
        return math.ceil(self.total_count / self.page_size)
    
    @rx.var
    def visible_pages(self) -> list[int]:
        total = self.total_pages

        if total <= 3:
            return list(range(1, total + 1))

        pages = {1, total, self.page}

        if self.page == 1:
            pages.add(2)
        elif self.page == total:
            pages.add(total - 1)

        return sorted(list(pages))