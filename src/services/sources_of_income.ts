import { db } from '../config/db'
import type { ServiceResult } from './types'
import type { SourceOfIncomeRecord } from '../types/sources_of_income'

export const sourcesOfIncomeService = {
  async create(
    name: string,
    category_id: bigint,
    income?: number
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    try {
      const source_of_income = await db.sourceOfIncome.create({
        data: { name, category_id, ...(income !== undefined ? { income } : {}) },
      })
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
        },
      }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2003')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { category_id: category_id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to create source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async list(): Promise<ServiceResult<SourceOfIncomeRecord[]>> {
    try {
      const sources_of_income = await db.sourceOfIncome.findMany({ orderBy: { id: 'asc' } })
      return {
        ok: true,
        data: sources_of_income.map((source_of_income) => ({
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
        })),
      }
    } catch (err: unknown) {
      return {
        ok: false,
        status: 500,
        message: 'Failed to fetch sources of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async update(
    id: bigint,
    data: { name?: string; category_id?: bigint; income?: number }
  ): Promise<ServiceResult<SourceOfIncomeRecord>> {
    if (Object.keys(data).length === 0)
      return { ok: false, status: 400, message: 'No fields to update' }

    try {
      const source_of_income = await db.sourceOfIncome.update({ where: { id }, data })
      return {
        ok: true,
        data: {
          id: source_of_income.id.toString(),
          name: source_of_income.name,
          category_id: source_of_income.category_id.toString(),
          income: source_of_income.income,
        },
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      if (code === 'P2003')
        return {
          ok: false,
          status: 404,
          message: 'Category not found',
          meta: { category_id: data.category_id?.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to update source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },

  async remove(id: bigint): Promise<ServiceResult<{ message: string }>> {
    try {
      await db.sourceOfIncome.delete({ where: { id } })
      return { ok: true, data: { message: 'Source of income deleted' } }
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2025')
        return {
          ok: false,
          status: 404,
          message: 'Source of income not found',
          meta: { id: id.toString() },
        }
      return {
        ok: false,
        status: 500,
        message: 'Failed to delete source of income',
        meta: { error: (err as Error)?.message },
      }
    }
  },
}
