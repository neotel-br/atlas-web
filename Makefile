.PHONY: dev prod prod-build prod-deploy prod-validate down logs-dev logs-prod build clean

DEV := docker compose -f docker-compose.dev.yml
PROD := docker compose -f docker-compose.prod.yml

dev:
	$(DEV) up --build

prod:
	./scripts/deploy-prod.sh

prod-validate:
	$(PROD) config

prod-build:
	$(PROD) build

prod-deploy:
	./scripts/deploy-prod.sh

down:
	-$(DEV) down --remove-orphans
	-$(PROD) down --remove-orphans

logs-dev:
	$(DEV) logs -f

logs-prod:
	$(PROD) logs -f

build:
	$(PROD) build

clean:
	-$(DEV) down -v --remove-orphans
	-$(PROD) down -v --remove-orphans
