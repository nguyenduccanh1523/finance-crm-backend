import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PersonalWorkspace } from './personal-workspace.entity';

@Entity({ name: 'exchange_rates' })
@Index(['workspaceId', 'fromCurrency', 'toCurrency'], { unique: true })
export class ExchangeRate extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => PersonalWorkspace, { onDelete: 'CASCADE' })
  workspace: PersonalWorkspace;

  @Column({ name: 'from_currency', type: 'char', length: 3 })
  fromCurrency: string; // VND, USD, EUR

  @Column({ name: 'to_currency', type: 'char', length: 3 })
  toCurrency: string; // VND, USD, EUR

  @Column({ name: 'rate', type: 'numeric', precision: 18, scale: 8 })
  rate: number; // 1 USD = 24500 VND

  /**
   * Base workspace currency (tham chiếu cho tất cả tính toán)
   * VD: workspace chọn VND làm base
   * Thì tất cả budget/goal đều theo VND
   */
  @Column({ name: 'base_currency', type: 'char', length: 3, default: 'VND' })
  baseCurrency: string;
}
