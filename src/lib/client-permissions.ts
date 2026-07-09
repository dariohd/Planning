export function canUserEdit(role: string): boolean {
  return role !== "Lecteur" && role !== "Non Autorisé";
}

export function isAdministrator(role: string): boolean {
  return role === "Administrateur";
}
