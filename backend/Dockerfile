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

# Flags de performance otimizadas
# -Djava.security.egd=file:/dev/./urandom acelera o SecureRandom (JWT/SSL)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "org.springframework.boot.loader.launch.JarLauncher"]

EXPOSE 8080
