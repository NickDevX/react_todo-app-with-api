export interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export enum Filter {
  All = 'all',
  Active = 'active',
  Completed = 'completed',
}

export enum Erors {
  QueryError = 'queryError',
  AddError = 'addError',
  TodosError = 'todosError',
  DeleteError = 'deleteError',
  UpdateError = 'updateError',
}
