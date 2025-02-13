interface UserI {
  id?: number;
  username?: string;
  password?: string;
  correo: string;
  is_admin?: boolean;
  created_at?: string;
  google_id?: string | undefined;
}

export default UserI;