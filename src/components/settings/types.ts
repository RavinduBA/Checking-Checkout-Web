export type ExpenseType = {
	id: string;
	main_type: string;
	sub_type: string;
	created_at: string;
};

export type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
};

export type Location = {
	id: string;
	name: string;
	is_active: boolean;
	address?: string;
	phone?: string;
	email?: string;
	tenant_id?: string;
};

export type CurrencyRate = {
	currency_code: string;
	usd_rate: number;
	is_custom: boolean;
	updated_at: string;
};