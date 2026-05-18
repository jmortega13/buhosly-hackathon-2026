# syntax=docker/dockerfile:1.7
# Two-stage build: compile the JAR with the JDK, then run it on the JRE.

FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Cache Gradle dependencies in a separate layer.
COPY gradle gradle
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN chmod +x ./gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# Build the bootable jar.
COPY src src
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

# Render injects PORT into the container's env. Spring Boot reads ${PORT:8080}
# via the server.port property below, so we don't hard-code 8080.
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -jar /app/app.jar --server.port=${PORT:-8080}"]
