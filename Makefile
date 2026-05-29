.PHONY: dev prod down logs build db-migrate db-seed db-shell shell clean

DEV  := docker compose -f docker-compose.dev.yml
PROD := docker compose -f docker-compose.prod.yml

dev:
	$(DEV) up --build

prod:
	$(PROD) up --build -d

down:
	-$(DEV) down
	-$(PROD) down

logs:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) logs -f; \
	else \
		$(PROD) logs -f; \
	fi

build:
	$(PROD) build

db-migrate:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app npm run db:migrate; \
	else \
		$(PROD) exec app npm run db:migrate; \
	fi

db-seed:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app npm run db:seed; \
	else \
		$(PROD) exec app npm run db:seed; \
	fi

db-shell:
	@if [ -n "$$($(DEV) ps -q db 2>/dev/null)" ]; then \
		$(DEV) exec db psql -U neodocs -d neodocs; \
	else \
		$(PROD) exec db psql -U neodocs -d neodocs; \
	fi

shell:
	@if [ -n "$$($(DEV) ps -q app 2>/dev/null)" ]; then \
		$(DEV) exec app sh; \
	else \
		$(PROD) exec app sh; \
	fi

clean:
	-$(DEV) down -v
	-$(PROD) down -v
