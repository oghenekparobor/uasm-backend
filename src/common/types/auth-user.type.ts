export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'worker'
  | 'platoon_leader'
  | 'assistant_platoon_leader'
  | 'children_teacher'
  | 'kitchen'
  | 'distribution';

export interface AuthenticatedUser {
  id: string; // maps to JWT sub
  role: AppRole;
  workerId?: string | null;
  platoonIds: string[];
}


