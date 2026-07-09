export type AppMode = "production" | "support";

export type PersonnelRecord = {
  id: string;
  matricule: string | null;
  nom: string;
  prenom: string;
  role: string;
  chefEquipeAssocie: string | null;
  section: string | null;
  typeQuart: string | null;
  quartDefaut: string | null;
  posteDeTravail: string | null;
  mftAssocie: string | null;
  responsableHierarchique: string | null;
  statut: string;
  tauxEfficacite: number;
};

export type DayPresence = {
  s: string;
  loc?: string;
  c?: string;
  hs?: string;
};

export type PresenceMap = Record<string, DayPresence>;

export type WeeklySchedule = {
  teamName: string;
  weekDates: string[];
  schedule: Record<string, Record<string, string>>;
  teamMembers: PersonnelRecord[];
  error?: string | null;
};

export type InitialData = {
  currentUser: { email: string; name: string; role: string };
  personnel: PersonnelRecord[];
  chefsEquipe: { name: string; role: string }[];
  rpList: { id: string; name: string }[];
  reapListForForm: { id: string; name: string }[];
  respPrepList: { id: string; name: string }[];
  respQualiteList: { id: string; name: string }[];
  lastModified: string;
  settings: { appName: string };
};
