interface UserI {
  id?: number;
  username?: string;
  password?: string;
  correo: string;
  is_admin?: boolean;
  created_at?: string;
  google_id?: string | undefined;
  webToken?: string;
  mobileToken?: string;
  refreshWebToken?: string;
  birthDate?: Date;
  fcm_token?: string;
}

export default UserI;