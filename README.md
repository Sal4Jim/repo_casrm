# CASRM_REPO
## 🚀 Instalación Rápida

1. `git clone [url]`
2. `cd REPO_CASRM` 
3. `npm install`     #
4. Configurar MySQL
5. `node server.js` ó `npm run dev`

Aquí tienes el resumen completo, paso a paso, para configurar todo en una nueva PC.

### 1\. Preparar el Proyecto

1.  Asegúrate de que la nueva PC tenga **Node.js** instalado.
2.  Copia la carpeta de tu proyecto (ej. `C:\Users\HP\Desktop\repo_casrm`) a la nueva PC.
3.  Abre una terminal, entra a esa carpeta (`cd C:\...`) y ejecuta `npm install` para instalar las dependencias de tu proyecto.

-----

### 2\. Instalar Herramientas Globales

En una terminal, instala PM2 y el servicio de Windows de forma global:

```bash
npm install pm2 -g
npm install pm2-windows-service -g
```

-----

### 3\. Crear Archivo de Configuración

Dentro de la carpeta de tu proyecto (junto al `package.json`), crea un archivo llamado **`ecosystem.config.js`** con este contenido exacto:

```javascript
module.exports = {
  apps: [
    {
      name: 'repo_casrm', // Puedes cambiar este nombre
      script: 'cmd',
      args: '/c "npm run dev"',  // El comando que quieres ejecutar
      interpreter: 'none',
      exec_mode: 'fork'
    }
  ]
};
```

-----

### 4\. Instalar el Servicio de Windows

Este es el paso más importante.

1.  Abre una nueva terminal con **Permisos de Administrador**.

2.  Ejecuta el instalador:

    ```bash
    pm2-service-install
    ```

3.  Te hará varias preguntas. Responde así:

      * `? Perform environment setup (recommended)?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? Set PM2_HOME?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? PM2_HOME value...:`
          * Escribe la ruta `C:\Users\[TU_USUARIO]\.pm2` (cambiando `[TU_USUARIO]` por el nombre de usuario de esa PC) y presiona **Enter**.
      * `? Set PM2_SERVICE_SCRIPTS?`
          * Escribe **n** y presiona **Enter** (No).
      * `? Set PM2_SERVICE_PM2_DIR?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? Specify the directory containing the pm2 version...`
          * Presiona **Enter** (aceptará la ruta por defecto que encuentra automáticamente).

4.  El script terminará y dirá: `PM2 service installed and started.`

-----

### 5\. Arrancar y Guardar la App

1.  Vuelve a una **terminal normal** (ya no necesitas ser admin).
2.  Navega a la carpeta de tu proyecto:
    ```bash
    cd C:\Users\HP\Desktop\repo_casrm
    ```
3.  Inicia la aplicación usando tu archivo de configuración:
    ```bash
    pm2 start ecosystem.config.js
    ```
4.  Verifica que esté `online`:
    ```bash
    pm2 list
    ```
5.  **Guarda** la lista de apps para que el servicio la recuerde al reiniciar:
    ```bash
    pm2 save
    ```
# CASRM_REPO
## 🚀 Instalación Rápida

1. `git clone [url]`
2. `cd REPO_CASRM` 
3. `npm install`     #
4. Configurar MySQL
5. `node server.js` ó `npm run dev`

Aquí tienes el resumen completo, paso a paso, para configurar todo en una nueva PC.

### 1\. Preparar el Proyecto

1.  Asegúrate de que la nueva PC tenga **Node.js** instalado.
2.  Copia la carpeta de tu proyecto (ej. `C:\Users\HP\Desktop\repo_casrm`) a la nueva PC.
3.  Abre una terminal, entra a esa carpeta (`cd C:\...`) y ejecuta `npm install` para instalar las dependencias de tu proyecto.

-----

### 2\. Instalar Herramientas Globales

En una terminal, instala PM2 y el servicio de Windows de forma global:

```bash
npm install pm2 -g
npm install pm2-windows-service -g
```

-----

### 3\. Crear Archivo de Configuración

Dentro de la carpeta de tu proyecto (junto al `package.json`), crea un archivo llamado **`ecosystem.config.js`** con este contenido exacto:

```javascript
module.exports = {
  apps: [
    {
      name: 'repo_casrm', // Puedes cambiar este nombre
      script: 'cmd',
      args: '/c "npm run dev"',  // El comando que quieres ejecutar
      interpreter: 'none',
      exec_mode: 'fork'
    }
  ]
};
```

-----

### 4\. Instalar el Servicio de Windows

Este es el paso más importante.

1.  Abre una nueva terminal con **Permisos de Administrador**.

2.  Ejecuta el instalador:

    ```bash
    pm2-service-install
    ```

3.  Te hará varias preguntas. Responde así:

      * `? Perform environment setup (recommended)?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? Set PM2_HOME?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? PM2_HOME value...:`
          * Escribe la ruta `C:\Users\[TU_USUARIO]\.pm2` (cambiando `[TU_USUARIO]` por el nombre de usuario de esa PC) y presiona **Enter**.
      * `? Set PM2_SERVICE_SCRIPTS?`
          * Escribe **n** y presiona **Enter** (No).
      * `? Set PM2_SERVICE_PM2_DIR?`
          * Presiona **Enter** (para aceptar "Y" - Sí).
      * `? Specify the directory containing the pm2 version...`
          * Presiona **Enter** (aceptará la ruta por defecto que encuentra automáticamente).

4.  El script terminará y dirá: `PM2 service installed and started.`

-----

### 5\. Arrancar y Guardar la App

1.  Vuelve a una **terminal normal** (ya no necesitas ser admin).
2.  Navega a la carpeta de tu proyecto:
    ```bash
    cd C:\Users\HP\Desktop\repo_casrm
    ```
3.  Inicia la aplicación usando tu archivo de configuración:
    ```bash
    pm2 start ecosystem.config.js
    ```
4.  Verifica que esté `online`:
    ```bash
    pm2 list
    ```
5.  **Guarda** la lista de apps para que el servicio la recuerde al reiniciar:
    ```bash
    pm2 save
    ```

¡Listo\! Reinicia la nueva PC. La aplicación se iniciará sola, en segundo plano y sin mostrar ninguna ventana de CMD.




Para conectar una impresora térmica por **WiFi / Red**, deberás hacer lo siguiente:
1.  **Averiguar la IP de tu impresora**:
    *   Imprime un ticket de "Self Test" (apaga la impresora, mantén presionado el botón FEED y enciéndela sin soltar el botón por unos segundos).
    *   En el ticket saldrá la IP (ej. `192.168.1.87`).
2.  **Configurar la IP en el código**:
    *   Abre el archivo `utils/printer.js`.
    *   Busca la línea `const PRINTER_IP = '...'`.
    *   Pon ahí la IP de tu impresora.
3.  **Listo**: El sistema se conectará automáticamente a esa IP.