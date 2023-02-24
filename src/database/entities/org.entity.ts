import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { IEntity } from '../../types';

@Entity({ name: 'orgs' })
export class OrgEntity implements IEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  @Index()
  chatId: number;
}
