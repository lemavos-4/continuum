import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "es" | "pt" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    profile: "Profile",
    accountData: "Account Data",
    updateInfo: "Update your main information.",
    username: "Username",
    email: "Email",
    currentPlan: "Current Plan",
    memberSince: "Member since",
    saveChanges: "Save changes",
    preferences: "Preferences",
    chooseTheme: "Choose the interface theme.",
    darkMode: "Dark mode",
    toggleDark: "Toggle between light and dark visual.",
    accountStatus: "Account Status",
    emailVerified: "Email verified",
    emailPending: "Email pending verification",
    planLimits: "Plan Limits",
    usageSync: "Usage synchronized with your account.",
    history: "History",
    days: "days",
    notes: "Notes",
    entities: "Entities",
    activities: "Activities",
    vault: "Vault",
    unlimited: "Unlimited",
  },
  es: {
    profile: "Perfil",
    accountData: "Datos de la Cuenta",
    updateInfo: "Actualiza tu información principal.",
    username: "Nombre de usuario",
    email: "Correo electrónico",
    currentPlan: "Plan Actual",
    memberSince: "Miembro desde",
    saveChanges: "Guardar cambios",
    preferences: "Preferencias",
    chooseTheme: "Elige el tema de la interfaz.",
    darkMode: "Modo oscuro",
    toggleDark: "Alternar entre visual claro y oscuro.",
    accountStatus: "Estado de la Cuenta",
    emailVerified: "Correo verificado",
    emailPending: "Correo pendiente de verificación",
    planLimits: "Límites del Plan",
    usageSync: "Uso sincronizado con tu cuenta.",
    history: "Historial",
    days: "días",
    notes: "Notas",
    entities: "Entidades",
    activities: "Actividades",
    vault: "Bóveda",
    unlimited: "Ilimitado",
  },
  pt: {
    profile: "Perfil",
    accountData: "Dados da Conta",
    updateInfo: "Atualize suas informações principais.",
    username: "Nome de usuário",
    email: "Email",
    currentPlan: "Plano Atual",
    memberSince: "Membro desde",
    saveChanges: "Salvar alterações",
    preferences: "Preferências",
    chooseTheme: "Escolha o tema da interface.",
    darkMode: "Modo escuro",
    toggleDark: "Alterne entre o visual claro e escuro.",
    accountStatus: "Status da Conta",
    emailVerified: "Email verificado",
    emailPending: "Email pendente de verificação",
    planLimits: "Limites do Plano",
    usageSync: "Uso sincronizado com sua conta.",
    history: "Histórico",
    days: "dias",
    notes: "Notas",
    entities: "Entidades",
    activities: "Atividades",
    vault: "Vault",
    unlimited: "Ilimitado",
  },
  fr: {
    profile: "Profil",
    accountData: "Données du Compte",
    updateInfo: "Mettez à jour vos informations principales.",
    username: "Nom d'utilisateur",
    email: "Email",
    currentPlan: "Plan Actuel",
    memberSince: "Membre depuis",
    saveChanges: "Sauvegarder les modifications",
    preferences: "Préférences",
    chooseTheme: "Choisissez le thème de l'interface.",
    darkMode: "Mode sombre",
    toggleDark: "Basculer entre l'apparence claire et sombre.",
    accountStatus: "Statut du Compte",
    emailVerified: "Email vérifié",
    emailPending: "Email en attente de vérification",
    planLimits: "Limites du Plan",
    usageSync: "Utilisation synchronisée avec votre compte.",
    history: "Historique",
    days: "jours",
    notes: "Notes",
    entities: "Entités",
    activities: "Activités",
    vault: "Coffre-fort",
    unlimited: "Illimité",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem("language") as Language;
    return saved && ["en", "es", "pt", "fr"].includes(saved) ? saved : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};