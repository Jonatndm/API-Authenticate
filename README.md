# Descripción
Este proyecto implementa una API de autenticación con funcionalidades de registro, inicio de sesión, renovación y revocación de tokens JWT. Incluye características de seguridad como encriptación de contraseñas, validación de fortaleza de contraseñas y bloqueo de cuentas tras múltiples intentos fallidos de inicio de sesión.
Requisitos previos

Node.js (v14 o superior)
MongoDB (local o remoto)
npm o yarn

## Instalación

1. Clona el repositorio:
```bash
  git clone https://github.com/tu-usuario/api-autenticacion.git
  cd api-autenticacion
```
2. Instala las dependencias:
```bash
  npm install
```
3. Crea un archivo .env en la raíz del proyecto con las siguientes variables:
```bash
  MONGO_URI=mongodb://localhost:27017/autenticacion
  JWT_SECRET=tu_clave_secreta_muy_segura
  JWT_EXPIRATION_TIME=24h
  MAX_LOGIN_ATTEMPTS=5
```
# Estructura del proyecto
```bash
├── config/
│   └── config.js
├── controllers/
│   └── authController.js
├── models/
│   └── User.js
├── utils/
│   └── passwordValidator.js
├── tests/
│   └── unit/
│       └── authController.test.js
├── .env
└── package.json
```
# Ejecución de pruebas
## Para ejecutar todas las pruebas con Jest:
```bash
  npm test
```
## Para ejecutar pruebas específicas:
```bash
  npm test -- -t "CP-01"
```
## Para ejecutar pruebas con cobertura:
```bash
  npm test -- --coverage
```

# Casos de prueba implementados
## El sistema incluye los siguientes casos de prueba:

CP-01: Registro de usuario válido
CP-02: Registro con email duplicado
CP-03: Login correcto
CP-04: Login con credenciales incorrectas
CP-07: Renovación de token
CP-09: Bloqueo de cuenta tras múltiples intentos fallidos
CP-10: Revocación de token (logout)
CP-11: Validación de fortaleza de contraseña

# Configuración avanzada
## Variables de entorno

MONGO_URI: URI de conexión a MongoDB
JWT_SECRET: Clave secreta para firmar tokens JWT
JWT_EXPIRATION_TIME: Tiempo de expiración de tokens (ejemplo: '1h', '24h', '7d')
MAX_LOGIN_ATTEMPTS: Número máximo de intentos de inicio de sesión antes de bloquear la cuenta

# Requisitos de contraseña
Las contraseñas deben cumplir con los siguientes requisitos:

Mínimo 8 caracteres
Al menos una letra mayúscula
Al menos una letra minúscula
Al menos un número
Al menos un carácter especial