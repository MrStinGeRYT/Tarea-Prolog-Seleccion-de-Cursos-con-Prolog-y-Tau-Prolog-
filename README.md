# Proyecto de Selección de Cursos con Prolog y Tau Prolog

**Nombre:Alejandro Campechano Graniel** 

**Materia:Programacion Avanzada**  

**Mombre del Maestro: Flores Hernández Jesús Alejandro**

## Descripción
Este proyecto presenta una aplicación interactiva desarrollada con **Prolog** y la librería **Tau Prolog**, la cual permite gestionar la seriación de cursos y verificar los requisitos necesarios para su aprobación.  

La interfaz fue creada en **HTML, CSS y JavaScript**, integrando la lógica declarativa de Prolog con un entorno visual que facilita la consulta de información académica por parte del usuario.

El sistema utiliza una base de conocimiento (`base_conocimiento_curso.pl`) que define los cursos, sus prerrequisitos y relaciones, mientras que el archivo `app.js` controla la comunicación entre la interfaz web y el motor de inferencia Prolog.

## Requisitos
````
- Navegador web moderno (Chrome, Firefox, Edge o equivalente).  
- Conexión a internet para cargar correctamente los recursos del entorno Tau Prolog.
````
## Instalación
````
*https://github.com/MrStinGeRYT/Tarea-Prolog-Seleccion-de-Cursos-con-Prolog-y-Tau-Prolog-.git*
````
## Uso de la aplicación
````
1. Abre el archivo **`index.html`** en tu navegador preferido.  
2. Espera a que se cargue el entorno de Tau Prolog y la base de conocimiento.  
3. Selecciona un alumno de la lista desplegable.  
4. Haz clic en **“Consultar”** para visualizar los cursos disponibles, el historial académico y los requisitos de seriación.  
5. El sistema mostrará las asignaturas cursadas y las materias que el estudiante puede inscribir según las reglas definidas en la base de conocimiento.
````
## Estructura del proyecto
Tarea Prolog
````
├── index.html # Interfaz principal del 
├── app.js # Lógica principal de conexión JS–Prolog
├── base_conocimiento_curso.pl # Base de conocimiento en Prolog
├── styles.css # Estilos de la interfaz web
├── tau-prolog.js # Librería Tau Prolog
├── tau-prolog-local.js # Dependencia local de Tau Prolog
├── lists.js # Módulo auxiliar de listas
└── README.md # Documento de descripción del proyecto
````