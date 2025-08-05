import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company', type: 'varchar', length: 100 })
  company: string;

  @Column({ name: 'unit', type: 'varchar', length: 100 })
  unit: string;

  @Column({ name: 'location', type: 'varchar', length: 200 })
  location: string;

  @Column({ name: 'status', type: 'enum', enum: ['open', 'closed', 'pending'], default: 'open' })
  status: string;

  @Column({ name: 'priority', type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'assigned_to', type: 'varchar', length: 100, nullable: true })
  assignedTo: string;

  @Column({ name: 'technician', type: 'varchar', length: 100, nullable: true })
  technician: string;

  @CreateDateColumn({ name: 'open_date' })
  openDate: Date;

  @Column({ name: 'close_date', type: 'datetime', nullable: true })
  closeDate: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
