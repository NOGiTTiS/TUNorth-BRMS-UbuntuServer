import { Room } from './room';

export interface Booking {
  id: number;
  start_time: string;
  end_time: string;
  subject: string;
  status: string; // pending, approved, rejected, cancelled
  
  // ข้อมูลเพิ่มเติมที่ต้องใช้แสดงใน Modal
  department?: string;
  phone?: string;
  attendees?: number;
  note?: string;
  resource_text?: string; 
  booking_resources?: any[];
  layout_image?: string;
  
  // Recurrence / Grouping
  recurring_group_id?: string;
  recurrence_type?: string;
  recurrence_index?: number;
  recurrence_total?: number;
  
  // Relations
  room_id: number;
  room?: Room;
  user?: {
      full_name: string;
  };
}