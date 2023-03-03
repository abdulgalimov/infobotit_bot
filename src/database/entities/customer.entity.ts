import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class CustomerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orgId: number;

  @Column()
  phone: string;

  @Column()
  createdAt: Date;
}
