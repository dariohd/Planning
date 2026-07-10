export type HelpCategory = {
  title: string;
  icon: string;
  color: string;
  questions: { q: string; a: string }[];
};

export type HelpLang = "fr" | "en" | "pt";

export const helpDatabase: Record<HelpLang, Record<string, HelpCategory>> = {
  fr: {
    admin: {
      title: "Droits & Accès",
      icon: "shield",
      color: "bg-rose-50 text-red-600",
      questions: [
        { q: "Comment donner les droits Administrateur ?", a: "Paramètres > Accès. Saisissez l'email, choisissez Administrateur, cliquez sur Ajouter puis Sauvegarder." },
        { q: "Puis-je créer de nouveaux rôles ?", a: "Oui, dans Paramètres > Général, section Rôles du personnel." },
        { q: "À quoi sert Générer l'année suivante ?", a: "Crée les plannings de l'année cible pour tous les collaborateurs actifs." },
      ],
    },
    personnel: {
      title: "Collaborateurs",
      icon: "user",
      color: "bg-emerald-50 text-emerald-600",
      questions: [
        { q: "Comment ajouter un collaborateur ?", a: "Vue Individuelle > bouton +. Renseignez le profil et le cycle horaire." },
        { q: "Comment archiver ?", a: "Ouvrez la fiche puis utilisez Archiver. Le profil passe en statut Archivé." },
        { q: "Intérimaires ?", a: "Attribuez le rôle Intérimaire. Ils sont mis en évidence en cyan dans la vue Équipe." },
      ],
    },
    quarts: {
      title: "Cycles & Horaires",
      icon: "clock",
      color: "bg-amber-50 text-amber-600",
      questions: [
        { q: "Cycle 9×10 ?", a: "Référence au premier lundi de l'année, alternance semaine courte / longue." },
        { q: "Jours fériés ?", a: "Calculés selon le pays (Paramètres > Général). Utilisez Réappliquer les fériés après changement de pays." },
      ],
    },
    mass_update: {
      title: "Modif. groupées",
      icon: "layers",
      color: "bg-purple-50 text-purple-600",
      questions: [
        { q: "Appliquer un statut à plusieurs personnes ?", a: "Vue Équipe > Modification groupée. Cochez, dates et statut." },
        { q: "Annuler une erreur ?", a: "Après validation, cliquez sur Annuler dans le bandeau (12 secondes)." },
      ],
    },
    reap: {
      title: "Chef d'équipe (REAP)",
      icon: "users",
      color: "bg-blue-50 text-blue-700",
      questions: [
        { q: "Modifier une présence ?", a: "Vue Équipe : cliquez sur la cellule du jour, choisissez le statut (CP, M, Abs, etc.)." },
        { q: "Voir uniquement mon équipe ?", a: "Filtrez par votre nom dans le sélecteur d'équipe en haut du tableau." },
        { q: "Saisir plusieurs jours d'un coup ?", a: "Vue Individuelle : sélectionnez le collaborateur, puis « Appliquer une plage » avec les dates." },
        { q: "Consulter sur téléphone ?", a: "Bouton Mobile en haut à droite." },
        { q: "Où est le mode d'emploi complet ?", a: "Bouton Guide en haut à droite." },
      ],
    },
    capa: {
      title: "Charge CAPA",
      icon: "factory",
      color: "bg-sky-50 text-sky-600",
      questions: [
        { q: "CAPA théorique vs temps réel ?", a: "Théorique via ETP. Temps réel via heures enregistrées / temps de prod avion." },
        { q: "Lien ADECC ?", a: "Paramètres > Capa, mode Auto. Les objectifs sont lus depuis le classeur ADECC (si accessible)." },
      ],
    },
    export: {
      title: "Exports",
      icon: "file",
      color: "bg-indigo-50 text-indigo-600",
      questions: [
        { q: "Imprimer le planning ?", a: "Vue Équipe, mode semaine, icône Imprimer." },
        { q: "Exporter le personnel ?", a: "Paramètres > Actions > Export CSV par rôle." },
        { q: "Sauvegarder toutes les données ?", a: "Paramètres > Données > Tout exporter (CSV) ou sauvegarde JSON technique." },
        { q: "Supprimer toutes les données ?", a: "Paramètres > Données > Zone sensible. Export proposé avant suppression." },
      ],
    },
  },
  en: {
    admin: {
      title: "Rights & Access",
      icon: "shield",
      color: "bg-rose-50 text-red-600",
      questions: [
        { q: "Grant Administrator rights?", a: "Settings > Access. Enter email, choose Administrator, Add, Save." },
        { q: "Custom roles?", a: "Yes, in Settings > General, Staff roles section." },
        { q: "Generate next year?", a: "Creates schedules for the target year for all active staff." },
      ],
    },
    personnel: {
      title: "Employees",
      icon: "user",
      color: "bg-emerald-50 text-emerald-600",
      questions: [
        { q: "Add an employee?", a: "Individual view > + button. Fill profile and shift cycle." },
        { q: "Archive someone?", a: "Open the record and use Archive." },
        { q: "Temporary workers?", a: "Assign Intérimaire role. Highlighted in cyan in Team view." },
      ],
    },
    quarts: {
      title: "Shifts",
      icon: "clock",
      color: "bg-amber-50 text-amber-600",
      questions: [
        { q: "9×10 cycle?", a: "Based on first Monday of the year, short/long week rotation." },
        { q: "Holidays?", a: "Based on country in Settings. Use Reapply holidays after changing country." },
      ],
    },
    mass_update: {
      title: "Mass updates",
      icon: "layers",
      color: "bg-purple-50 text-purple-600",
      questions: [
        { q: "Apply status to many people?", a: "Team view > Mass update." },
        { q: "Undo?", a: "Click Cancel in the toast banner within 12 seconds." },
      ],
    },
    reap: {
      title: "Team lead (REAP)",
      icon: "users",
      color: "bg-blue-50 text-blue-700",
      questions: [
        { q: "Edit attendance?", a: "Team view: click a day cell and pick a status." },
        { q: "Filter my team?", a: "Use the team selector at the top of the table." },
        { q: "Enter several days?", a: "Individual view: date range tool." },
        { q: "Mobile access?", a: "Mobile button top right." },
        { q: "Full handbook?", a: "Guide button top right." },
      ],
    },
    capa: {
      title: "CAPA",
      icon: "factory",
      color: "bg-sky-50 text-sky-600",
      questions: [
        { q: "Theoretical vs real-time?", a: "Theoretical uses FTE. Real-time uses recorded hours / plane production time." },
        { q: "ADECC link?", a: "Settings > Capa, Auto mode." },
      ],
    },
    export: {
      title: "Exports",
      icon: "file",
      color: "bg-indigo-50 text-indigo-600",
      questions: [
        { q: "Print schedule?", a: "Team view, week mode, Print button." },
        { q: "Export staff?", a: "Settings > Actions > Export personnel (CSV)." },
      ],
    },
  },
  pt: {
    admin: {
      title: "Acessos",
      icon: "shield",
      color: "bg-rose-50 text-red-600",
      questions: [
        { q: "Dar direitos de Administrador?", a: "Configurações > Acessos." },
        { q: "Novos papéis?", a: "Sim, em Configurações > Geral." },
        { q: "Gerar ano seguinte?", a: "Cria planeamentos para o ano alvo." },
      ],
    },
    personnel: {
      title: "Colaboradores",
      icon: "user",
      color: "bg-emerald-50 text-emerald-600",
      questions: [
        { q: "Adicionar colaborador?", a: "Vista Individual > botão +." },
        { q: "Arquivar?", a: "Abra a ficha e use Arquivar." },
        { q: "Interinos?", a: "Papel Intérimaire, destacado a ciano." },
      ],
    },
    quarts: {
      title: "Turnos",
      icon: "clock",
      color: "bg-amber-50 text-amber-600",
      questions: [
        { q: "Ciclo 9×10?", a: "Baseado na primeira segunda-feira do ano." },
        { q: "Feriados?", a: "Conforme o país nas Configurações." },
      ],
    },
    mass_update: {
      title: "Alterações em massa",
      icon: "layers",
      color: "bg-purple-50 text-purple-600",
      questions: [
        { q: "Aplicar estado a várias pessoas?", a: "Vista Equipa > Alteração em massa." },
        { q: "Anular?", a: "Clique em Anular no aviso (12 segundos)." },
      ],
    },
    reap: {
      title: "Chefe de equipa (REAP)",
      icon: "users",
      color: "bg-blue-50 text-blue-700",
      questions: [
        { q: "Editar presença?", a: "Vista Equipa: clique na célula do dia." },
        { q: "Filtrar a minha equipa?", a: "Seletor de equipa no topo da tabela." },
        { q: "Vários dias de uma vez?", a: "Vista Individual: intervalo de datas." },
        { q: "No telemóvel?", a: "Botão Mobile." },
        { q: "Manual completo?", a: "Botão Guia no topo." },
      ],
    },
    capa: {
      title: "CAPA",
      icon: "factory",
      color: "bg-sky-50 text-sky-600",
      questions: [
        { q: "Teórico vs real?", a: "Teórico via ETP. Real via horas registadas." },
        { q: "ADECC?", a: "Configurações > Capa, modo Auto." },
      ],
    },
    export: {
      title: "Exportações",
      icon: "file",
      color: "bg-indigo-50 text-indigo-600",
      questions: [
        { q: "Imprimir?", a: "Vista Equipa, modo semana." },
        { q: "Exportar pessoal?", a: "Configurações > Ações > Exportar CSV." },
      ],
    },
  },
};
