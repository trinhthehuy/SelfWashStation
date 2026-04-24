export interface User {
  id: number;
  email: string;
  password_hash: string;
  role_id: number;
}

export interface Device {
  id: number;
  device_uid: string;
  device_type_id: number;
  station_id: number;
  device_code: string;
}

export interface WashSession {
  id: number;
  device_id: number;
  station_id: number;
  start_time: Date;
  end_time: Date;
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: Date;
}

export interface Payment {
  id: number;
  session_id: number;
  payment_method: string;
  amount: number;
  status: string;
  paid_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
