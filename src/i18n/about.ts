import type { Module } from "./index";

/**
 * About / How it works page copy (transparency page).
 */
export const dict: Module = {
  en: {
    ab_badge: "Open Source",
    ab_hero_title: "Built to make your knowledge work for you.",
    ab_hero_sub:
      "Continuum is an open-source personal knowledge management system designed to help you capture, connect, and resurface what matters.",
    ab_hero_cta: "View source on GitHub",
    ab_back_to_home: "Back to home",

    ab_what_title: "What is Continuum?",
    ab_what_body:
      "Continuum is a personal knowledge management system built around the idea that notes shouldn't just be stored — they should stay connected to the things you care about.",
    ab_what_p1: "Create notes",
    ab_what_p2: "Connect notes to each other",
    ab_what_p3: "Mention people, projects and topics",
    ab_what_p4: "Visualize relationships through the knowledge graph",
    ab_what_p5: "Import Markdown",
    ab_what_p6: "Sync your information across devices",
    ab_what_p7: "Get relevant content resurfaced",
    ab_step1: "Capture",
    ab_step2: "Connect",
    ab_step3: "Understand",
    ab_step4: "Resurface",

    ab_how_title: "How it works",
    ab_how_sub: "A simple view of where your data goes when you use Continuum.",
    ab_how_user: "You",
    ab_how_frontend_t: "Frontend",
    ab_how_frontend_d: "Your browser or mobile interface is where you create and interact with your notes.",
    ab_how_api_t: "API",
    ab_how_api_d:
      "The Continuum backend validates requests, applies permissions and handles the application's business logic.",
    ab_how_auth_t: "Authentication",
    ab_how_auth_d: "Your requests are authenticated before accessing your private data.",
    ab_how_db_t: "Database",
    ab_how_db_d:
      "Structured information such as notes, entities and relationships is stored in the application's database.",
    ab_how_storage_t: "File storage",
    ab_how_storage_d: "Note content and files can be stored separately from structured application data.",

    ab_data_title: "Your data belongs to your account",
    ab_data_body1: "Continuum is designed so that your data is scoped to your account.",
    ab_data_body2:
      "Requests are associated with the authenticated user, and operations involving private data verify ownership before accessing or modifying it.",
    ab_data_note:
      "Security is an ongoing process. The source code is public so the community can inspect, review and improve it.",

    ab_oss_title: "Open source by design.",
    ab_oss_body:
      "Continuum is open source. We believe software that stores personal knowledge should be transparent about how it works.",
    ab_oss_github_d: "The full source code, public and open.",
    ab_oss_backend_d: "Java + Spring Boot API that powers the app.",
    ab_oss_frontend_d: "React + TypeScript interface you use every day.",
    ab_oss_arch_d: "See how the pieces fit together.",
    ab_oss_issues_d: "Report problems and suggest improvements.",
    ab_oss_cta: "Explore the source code",
    ab_oss_contribute: "Contribute",

    ab_tech_title: "Technology",
    ab_tech_sub: "The main pieces that power Continuum today.",
    ab_tech_backend: "Backend",
    ab_tech_frontend: "Frontend",
    ab_tech_data: "Data",
    ab_tech_storage: "Storage",
    ab_tech_infra: "Infrastructure",
    ab_tech_auth: "Authentication",

    ab_note_title: "From note to knowledge",
    ab_note_s1: "You write a note",
    ab_note_s2: "Continuum stores and processes the note",
    ab_note_s3: "You connect it to people, projects or topics",
    ab_note_s4: "Those relationships become part of your knowledge graph",
    ab_note_s5: "Continuum can resurface relevant information later",

    ab_why_title: "Why open source?",
    ab_why_lead: "We don't want transparency to be a marketing claim.",
    ab_why_body:
      "By keeping the code public, anyone can inspect how Continuum works, report problems, suggest improvements or contribute to the project.",
    ab_why_inspect_t: "Inspect",
    ab_why_inspect_d: "See how the application works.",
    ab_why_improve_t: "Improve",
    ab_why_improve_d: "Report issues and suggest changes.",
    ab_why_contribute_t: "Contribute",
    ab_why_contribute_d: "Help build the future of Continuum.",

    ab_story_title: "Where it started",
    ab_story_p1:
      "Continuum started as a personal attempt to solve a simple problem: having lots of notes, but rarely revisiting them.",
    ab_story_p2:
      "After experimenting with different tools and workflows, the project evolved into a personal knowledge management system focused on connections, context and resurfacing.",

    ab_cta_title: "Want to see how it works?",
    ab_cta_try: "Try Continuum",
    ab_cta_github: "View on GitHub",

    ab_disclaimer:
      "Continuum is an evolving open-source project. Features, infrastructure and security practices may change as the project grows.",
  },

  es: {
    ab_badge: "Código abierto",
    ab_hero_title: "Creado para que tu conocimiento trabaje para ti.",
    ab_hero_sub:
      "Continuum es un sistema de gestión de conocimiento personal de código abierto, diseñado para ayudarte a capturar, conectar y recuperar lo que importa.",
    ab_hero_cta: "Ver el código en GitHub",
    ab_back_to_home: "Volver al inicio",

    ab_what_title: "¿Qué es Continuum?",
    ab_what_body:
      "Continuum es un sistema de gestión de conocimiento personal basado en la idea de que las notas no deberían solo almacenarse: deberían seguir conectadas a las cosas que te importan.",
    ab_what_p1: "Crear notas",
    ab_what_p2: "Conectar notas entre sí",
    ab_what_p3: "Mencionar personas, proyectos y temas",
    ab_what_p4: "Visualizar relaciones a través del knowledge graph",
    ab_what_p5: "Importar Markdown",
    ab_what_p6: "Sincronizar tu información entre dispositivos",
    ab_what_p7: "Recibir contenido relevante de vuelta",
    ab_step1: "Captura",
    ab_step2: "Conecta",
    ab_step3: "Comprende",
    ab_step4: "Recupera",

    ab_how_title: "Cómo funciona",
    ab_how_sub: "Una vista simple de a dónde van tus datos cuando usas Continuum.",
    ab_how_user: "Tú",
    ab_how_frontend_t: "Frontend",
    ab_how_frontend_d: "Tu navegador o interfaz móvil es donde creas e interactúas con tus notas.",
    ab_how_api_t: "API",
    ab_how_api_d:
      "El backend de Continuum valida las solicitudes, aplica permisos y gestiona la lógica de negocio de la aplicación.",
    ab_how_auth_t: "Autenticación",
    ab_how_auth_d: "Tus solicitudes se autentican antes de acceder a tus datos privados.",
    ab_how_db_t: "Base de datos",
    ab_how_db_d:
      "La información estructurada, como notas, entidades y relaciones, se almacena en la base de datos de la aplicación.",
    ab_how_storage_t: "Almacenamiento de archivos",
    ab_how_storage_d:
      "El contenido de las notas y los archivos pueden almacenarse por separado de los datos estructurados.",

    ab_data_title: "Tus datos pertenecen a tu cuenta",
    ab_data_body1: "Continuum está diseñado para que tus datos estén limitados a tu cuenta.",
    ab_data_body2:
      "Las solicitudes se asocian con el usuario autenticado, y las operaciones con datos privados verifican la propiedad antes de acceder o modificar algo.",
    ab_data_note:
      "La seguridad es un proceso continuo. El código fuente es público para que la comunidad pueda inspeccionarlo, revisarlo y mejorarlo.",

    ab_oss_title: "Código abierto por diseño.",
    ab_oss_body:
      "Continuum es de código abierto. Creemos que el software que almacena conocimiento personal debe ser transparente sobre cómo funciona.",
    ab_oss_github_d: "El código fuente completo, público y abierto.",
    ab_oss_backend_d: "La API en Java + Spring Boot que impulsa la app.",
    ab_oss_frontend_d: "La interfaz en React + TypeScript que usas cada día.",
    ab_oss_arch_d: "Mira cómo encajan las piezas.",
    ab_oss_issues_d: "Reporta problemas y sugiere mejoras.",
    ab_oss_cta: "Explorar el código fuente",
    ab_oss_contribute: "Contribuir",

    ab_tech_title: "Tecnología",
    ab_tech_sub: "Las piezas principales que hoy impulsan Continuum.",
    ab_tech_backend: "Backend",
    ab_tech_frontend: "Frontend",
    ab_tech_data: "Datos",
    ab_tech_storage: "Almacenamiento",
    ab_tech_infra: "Infraestructura",
    ab_tech_auth: "Autenticación",

    ab_note_title: "De nota a conocimiento",
    ab_note_s1: "Escribes una nota",
    ab_note_s2: "Continuum la almacena y la procesa",
    ab_note_s3: "La conectas con personas, proyectos o temas",
    ab_note_s4: "Esas relaciones pasan a formar parte de tu knowledge graph",
    ab_note_s5: "Continuum puede recuperar información relevante más adelante",

    ab_why_title: "¿Por qué código abierto?",
    ab_why_lead: "No queremos que la transparencia sea solo una frase de marketing.",
    ab_why_body:
      "Al mantener el código público, cualquiera puede inspeccionar cómo funciona Continuum, reportar problemas, sugerir mejoras o contribuir al proyecto.",
    ab_why_inspect_t: "Inspecciona",
    ab_why_inspect_d: "Mira cómo funciona la aplicación.",
    ab_why_improve_t: "Mejora",
    ab_why_improve_d: "Reporta problemas y sugiere cambios.",
    ab_why_contribute_t: "Contribuye",
    ab_why_contribute_d: "Ayuda a construir el futuro de Continuum.",

    ab_story_title: "Dónde empezó",
    ab_story_p1:
      "Continuum comenzó como un intento personal de resolver un problema simple: tener muchas notas, pero casi nunca volver a verlas.",
    ab_story_p2:
      "Después de experimentar con distintas herramientas y flujos de trabajo, el proyecto evolucionó hasta convertirse en un sistema de gestión de conocimiento personal centrado en conexiones, contexto y recuperación.",

    ab_cta_title: "¿Quieres ver cómo funciona?",
    ab_cta_try: "Probar Continuum",
    ab_cta_github: "Ver en GitHub",

    ab_disclaimer:
      "Continuum es un proyecto de código abierto en evolución. Las funciones, la infraestructura y las prácticas de seguridad pueden cambiar a medida que el proyecto crece.",
  },

  pt: {
    ab_badge: "Código aberto",
    ab_hero_title: "Feito para o seu conhecimento trabalhar por você.",
    ab_hero_sub:
      "O Continuum é um sistema de gestão de conhecimento pessoal de código aberto, criado para ajudar você a capturar, conectar e recuperar o que importa.",
    ab_hero_cta: "Ver o código no GitHub",
    ab_back_to_home: "Voltar ao início",

    ab_what_title: "O que é o Continuum?",
    ab_what_body:
      "O Continuum é um sistema de gestão de conhecimento pessoal baseado na ideia de que notas não devem apenas ser armazenadas — elas devem continuar conectadas às coisas que importam para você.",
    ab_what_p1: "Criar notas",
    ab_what_p2: "Conectar notas entre si",
    ab_what_p3: "Mencionar pessoas, projetos e tópicos",
    ab_what_p4: "Visualizar relações pelo knowledge graph",
    ab_what_p5: "Importar Markdown",
    ab_what_p6: "Sincronizar suas informações entre dispositivos",
    ab_what_p7: "Receber conteúdo relevante de volta",
    ab_step1: "Capture",
    ab_step2: "Conecte",
    ab_step3: "Entenda",
    ab_step4: "Redescubra",

    ab_how_title: "Como funciona",
    ab_how_sub: "Uma visão simples de para onde seus dados vão quando você usa o Continuum.",
    ab_how_user: "Você",
    ab_how_frontend_t: "Frontend",
    ab_how_frontend_d: "Seu navegador ou a interface móvel é onde você cria e interage com suas notas.",
    ab_how_api_t: "API",
    ab_how_api_d:
      "O backend do Continuum valida as requisições, aplica permissões e cuida da lógica de negócio da aplicação.",
    ab_how_auth_t: "Autenticação",
    ab_how_auth_d: "Suas requisições são autenticadas antes de acessar seus dados privados.",
    ab_how_db_t: "Banco de dados",
    ab_how_db_d:
      "Informações estruturadas, como notas, entidades e relações, ficam armazenadas no banco de dados da aplicação.",
    ab_how_storage_t: "Armazenamento de arquivos",
    ab_how_storage_d:
      "O conteúdo das notas e os arquivos podem ser armazenados separadamente dos dados estruturados.",

    ab_data_title: "Seus dados pertencem à sua conta",
    ab_data_body1: "O Continuum foi desenhado para que seus dados fiquem limitados à sua conta.",
    ab_data_body2:
      "As requisições são associadas ao usuário autenticado, e operações com dados privados verificam a propriedade antes de acessar ou modificar qualquer coisa.",
    ab_data_note:
      "Segurança é um processo contínuo. O código-fonte é público para que a comunidade possa inspecionar, revisar e melhorar.",

    ab_oss_title: "Código aberto por design.",
    ab_oss_body:
      "O Continuum é open source. Acreditamos que software que guarda conhecimento pessoal deve ser transparente sobre como funciona.",
    ab_oss_github_d: "O código-fonte completo, público e aberto.",
    ab_oss_backend_d: "A API em Java + Spring Boot que alimenta o app.",
    ab_oss_frontend_d: "A interface em React + TypeScript que você usa todo dia.",
    ab_oss_arch_d: "Veja como as peças se encaixam.",
    ab_oss_issues_d: "Reporte problemas e sugira melhorias.",
    ab_oss_cta: "Explorar o código-fonte",
    ab_oss_contribute: "Contribuir",

    ab_tech_title: "Tecnologia",
    ab_tech_sub: "As principais peças que alimentam o Continuum hoje.",
    ab_tech_backend: "Backend",
    ab_tech_frontend: "Frontend",
    ab_tech_data: "Dados",
    ab_tech_storage: "Armazenamento",
    ab_tech_infra: "Infraestrutura",
    ab_tech_auth: "Autenticação",

    ab_note_title: "De nota a conhecimento",
    ab_note_s1: "Você escreve uma nota",
    ab_note_s2: "O Continuum armazena e processa a nota",
    ab_note_s3: "Você a conecta a pessoas, projetos ou tópicos",
    ab_note_s4: "Essas relações passam a fazer parte do seu knowledge graph",
    ab_note_s5: "O Continuum pode recuperar informações relevantes depois",

    ab_why_title: "Por que código aberto?",
    ab_why_lead: "Não queremos que transparência seja só uma frase de marketing.",
    ab_why_body:
      "Ao manter o código público, qualquer pessoa pode inspecionar como o Continuum funciona, reportar problemas, sugerir melhorias ou contribuir com o projeto.",
    ab_why_inspect_t: "Inspecione",
    ab_why_inspect_d: "Veja como a aplicação funciona.",
    ab_why_improve_t: "Melhore",
    ab_why_improve_d: "Reporte problemas e sugira mudanças.",
    ab_why_contribute_t: "Contribua",
    ab_why_contribute_d: "Ajude a construir o futuro do Continuum.",

    ab_story_title: "Onde começou",
    ab_story_p1:
      "O Continuum começou como uma tentativa pessoal de resolver um problema simples: ter muitas notas, mas quase nunca revisitá-las.",
    ab_story_p2:
      "Depois de experimentar diferentes ferramentas e fluxos de trabalho, o projeto evoluiu para um sistema de gestão de conhecimento pessoal focado em conexões, contexto e resurfacing.",

    ab_cta_title: "Quer ver como funciona?",
    ab_cta_try: "Experimentar o Continuum",
    ab_cta_github: "Ver no GitHub",

    ab_disclaimer:
      "O Continuum é um projeto open source em evolução. Recursos, infraestrutura e práticas de segurança podem mudar conforme o projeto cresce.",
  },

  fr: {
    ab_badge: "Open source",
    ab_hero_title: "Conçu pour que votre savoir travaille pour vous.",
    ab_hero_sub:
      "Continuum est un système de gestion des connaissances personnel open source, conçu pour vous aider à capturer, relier et faire resurgir ce qui compte.",
    ab_hero_cta: "Voir le code sur GitHub",
    ab_back_to_home: "Retour à l'accueil",

    ab_what_title: "Qu'est-ce que Continuum ?",
    ab_what_body:
      "Continuum est un système de gestion des connaissances personnel fondé sur une idée simple : les notes ne devraient pas être simplement stockées — elles devraient rester reliées à ce qui compte pour vous.",
    ab_what_p1: "Créer des notes",
    ab_what_p2: "Relier les notes entre elles",
    ab_what_p3: "Mentionner des personnes, projets et sujets",
    ab_what_p4: "Visualiser les relations grâce au knowledge graph",
    ab_what_p5: "Importer du Markdown",
    ab_what_p6: "Synchroniser vos informations sur vos appareils",
    ab_what_p7: "Revoir le contenu pertinent remonter",
    ab_step1: "Capturez",
    ab_step2: "Reliez",
    ab_step3: "Comprenez",
    ab_step4: "Retrouvez",

    ab_how_title: "Comment ça marche",
    ab_how_sub: "Une vue simple du chemin de vos données quand vous utilisez Continuum.",
    ab_how_user: "Vous",
    ab_how_frontend_t: "Frontend",
    ab_how_frontend_d:
      "Votre navigateur ou l'interface mobile est l'endroit où vous créez et utilisez vos notes.",
    ab_how_api_t: "API",
    ab_how_api_d:
      "Le backend de Continuum valide les requêtes, applique les permissions et gère la logique métier de l'application.",
    ab_how_auth_t: "Authentification",
    ab_how_auth_d: "Vos requêtes sont authentifiées avant d'accéder à vos données privées.",
    ab_how_db_t: "Base de données",
    ab_how_db_d:
      "Les informations structurées — notes, entités et relations — sont stockées dans la base de données de l'application.",
    ab_how_storage_t: "Stockage de fichiers",
    ab_how_storage_d:
      "Le contenu des notes et les fichiers peuvent être stockés séparément des données structurées.",

    ab_data_title: "Vos données appartiennent à votre compte",
    ab_data_body1: "Continuum est conçu pour que vos données soient limitées à votre compte.",
    ab_data_body2:
      "Les requêtes sont associées à l'utilisateur authentifié, et les opérations sur les données privées vérifient la propriété avant tout accès ou modification.",
    ab_data_note:
      "La sécurité est un processus continu. Le code source est public pour que la communauté puisse l'inspecter, le réviser et l'améliorer.",

    ab_oss_title: "Open source par conception.",
    ab_oss_body:
      "Continuum est open source. Nous pensons qu'un logiciel qui conserve des connaissances personnelles doit être transparent sur son fonctionnement.",
    ab_oss_github_d: "Le code source complet, public et ouvert.",
    ab_oss_backend_d: "L'API Java + Spring Boot qui fait tourner l'app.",
    ab_oss_frontend_d: "L'interface React + TypeScript que vous utilisez chaque jour.",
    ab_oss_arch_d: "Voyez comment les pièces s'assemblent.",
    ab_oss_issues_d: "Signalez des problèmes et proposez des améliorations.",
    ab_oss_cta: "Explorer le code source",
    ab_oss_contribute: "Contribuer",

    ab_tech_title: "Technologie",
    ab_tech_sub: "Les principales pièces qui font tourner Continuum aujourd'hui.",
    ab_tech_backend: "Backend",
    ab_tech_frontend: "Frontend",
    ab_tech_data: "Données",
    ab_tech_storage: "Stockage",
    ab_tech_infra: "Infrastructure",
    ab_tech_auth: "Authentification",

    ab_note_title: "De la note au savoir",
    ab_note_s1: "Vous écrivez une note",
    ab_note_s2: "Continuum la stocke et la traite",
    ab_note_s3: "Vous la reliez à des personnes, projets ou sujets",
    ab_note_s4: "Ces relations rejoignent votre knowledge graph",
    ab_note_s5: "Continuum peut faire resurgir l'information pertinente plus tard",

    ab_why_title: "Pourquoi l'open source ?",
    ab_why_lead: "Nous ne voulons pas que la transparence soit un simple slogan marketing.",
    ab_why_body:
      "En gardant le code public, chacun peut inspecter le fonctionnement de Continuum, signaler des problèmes, proposer des améliorations ou contribuer au projet.",
    ab_why_inspect_t: "Inspectez",
    ab_why_inspect_d: "Voyez comment l'application fonctionne.",
    ab_why_improve_t: "Améliorez",
    ab_why_improve_d: "Signalez des problèmes et proposez des changements.",
    ab_why_contribute_t: "Contribuez",
    ab_why_contribute_d: "Aidez à construire l'avenir de Continuum.",

    ab_story_title: "L'origine",
    ab_story_p1:
      "Continuum est né d'une tentative personnelle de résoudre un problème simple : avoir beaucoup de notes, mais rarement les revisiter.",
    ab_story_p2:
      "Après avoir expérimenté différents outils et flux de travail, le projet est devenu un système de gestion des connaissances personnel axé sur les connexions, le contexte et la remontée d'informations.",

    ab_cta_title: "Envie de voir comment ça marche ?",
    ab_cta_try: "Essayer Continuum",
    ab_cta_github: "Voir sur GitHub",

    ab_disclaimer:
      "Continuum est un projet open source en évolution. Les fonctionnalités, l'infrastructure et les pratiques de sécurité peuvent changer à mesure que le projet grandit.",
  },
};
