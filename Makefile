docker-local:
	docker compose up --build --force-recreate leo-backend-local --remove-orphans

docker-local-clean:
	docker compose build --no-cache && docker compose up --force-recreate leo-backend-local --remove-orphans

docker-dev:
	docker compose up --build --force-recreate leo-backend-dev --remove-orphans

docker-dev-clean:
	docker compose build --no-cache && docker compose up --force-recreate leo-backend-dev --remove-orphans

docker-prod:
	docker compose up --build --force-recreate leo-backend-prod --remove-orphans

docker-prod-clean:
	docker compose build --no-cache && docker compose up --force-recreate leo-backend-prod --remove-orphans

docker-stop:
	docker compose down --rmi all --remove-orphans