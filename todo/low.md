# Low Priority Fixes — İyileştirme (Kalanlar)

## L1: `api/routes/tasks.py` — `delete_task` race window
- `project_id = task.project_id` fetch ve broadcast arasında race var.

## L2: `api/routes/agents.py` — `remove_skill` 204 dönüşü
- İdempotent ama 200 dönüyor; 204 veya idempotency dokümantasyonu.

## L3: `api/routes/projects.py` — `delete_project` project websocket broadcast yok
- Sadece global broadcast yapılıyor, project kanalı haberdar değil.

## L4: `api/routes/tasks.py` — `POST /tasks/{id}/move` → PATCH/PUT
- REST convention'a uygun HTTP method değişikliği.

## L9: `web/src/components/TaskCard.tsx` + `Column.tsx` — `aria-label` eksik
- Delete (🗑) ve column actions (⋮) butonlarında erişilebilirlik eksik.

## L10: `web/src/hooks/useBoard.ts` — Unsafe type assertions
- `msg.payload as unknown as Task` runtime güvenlik yok; `zod` veya `typeof` validasyonu.

## L13: `web/src/pages/Models.tsx` + `Skills.tsx` + `Settings.tsx` — Form label yok
- Input'ların visible `<label>`'i yok, sadece placeholder.

## L14: `web/src/App.tsx` — Tab değişimi unmount ediyor
- Sayfa state'leri (scroll, form drafts) kayboluyor.

## L15: `src/vibe_kanban_clone/executors/registry.py` — `_EXECUTORS` mutable global
- `types.MappingProxyType` kullanılabilir.

## L19: `tests/test_api_*.py` — WebSocket broadcast assertion yok
- `broadcast_project`/`broadcast_global` mock'lanıp çağrı sayısı kontrol edilmiyor.
