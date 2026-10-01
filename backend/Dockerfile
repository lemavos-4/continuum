# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build

# Cache dependencies
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline

# Build the app
COPY src ./src
RUN ./mvnw -Dmaven.test.skip=true package

# Extração de camadas (O segredo da velocidade)
RUN java -Djarmode=layertools -jar target/*SNAPSHOT.jar extract

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Security
RUN addgroup --system spring && adduser --system spring --ingroup spring

# Copiando as camadas extraídas (mais rápido que copiar o JAR inteiro)
COPY --from=builder /build/dependencies/ ./
COPY --from=builder /build/spring-boot-loader/ ./
COPY --from=builder /build/snapshot-dependencies/ ./
COPY --from=builder /build/application/ ./

USER spring:spring

# Render Free has 512 MB total container memory. Keep the Java heap explicit at
# 256 MB so native memory, Spring Boot, MongoDB, AWS SDK and connection pools
# retain the remaining budget instead of relying on JVM container heuristics.
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-Xmx256m", "-Djava.security.egd=file:/dev/./urandom", "org.springframework.boot.loader.launch.JarLauncher"]

EXPOSE 8080
