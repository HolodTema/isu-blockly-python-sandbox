.DEFAULT_GOAL=check-all-run-dev

.PHONY=lint tests check-all run-dev run-build check-all-run-dev

# we set minus character before command not to fail target if the command is failed
lint:
	npm run lint; true

tests:
	npm run test:run


check-all: lint tests

run-dev:
	npm run dev

run-build:
	npm run build
	npm run preview

check-all-run-dev: check-all run-dev

