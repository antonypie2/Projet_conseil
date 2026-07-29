import json
import logging
from typing import Awaitable, Callable

from sqlalchemy.orm import Session

from .models import CacheEntry, utcnow

logger = logging.getLogger("cache")


async def cache_get_or_fetch(
    db: Session,
    key: str,
    ttl_seconds: int,
    fetch_fn: Callable[[], Awaitable[dict]],
    refresh: bool = False,
) -> dict:
    """Sert une réponse mise en cache si elle est encore fraîche, sinon appelle
    fetch_fn (async) et met à jour le cache. Si fetch_fn échoue et qu'une
    entrée périmée existe, la renvoie plutôt que de faire échouer la requête —
    mieux vaut une donnée un peu ancienne qu'une erreur, tant que la donnée
    provient bien d'un appel réel antérieur."""
    entry = db.get(CacheEntry, key)

    if not refresh and entry is not None:
        age = (utcnow() - entry.cached_at).total_seconds()
        if age < ttl_seconds:
            return json.loads(entry.data_json)

    try:
        data = await fetch_fn()
    except Exception:
        if entry is not None:
            logger.warning("Fetch failed for %s, serving stale cache instead.", key)
            return json.loads(entry.data_json)
        raise

    if entry is None:
        entry = CacheEntry(key=key, data_json=json.dumps(data), cached_at=utcnow())
        db.add(entry)
    else:
        entry.data_json = json.dumps(data)
        entry.cached_at = utcnow()
    db.commit()

    return data
