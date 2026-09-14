FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.12-slim AS runtime

ENV HOST=0.0.0.0
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=build /app/dist ./dist
COPY specloop_agent ./specloop_agent
EXPOSE 8787
CMD ["python", "-m", "specloop_agent"]
