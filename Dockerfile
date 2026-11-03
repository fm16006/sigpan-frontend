# Entorno local: la app sin SSR detras de nginx. Azure sigue usando el servidor Node.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production,docker

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/proyecto-panaderia-igf115/browser /usr/share/nginx/html
