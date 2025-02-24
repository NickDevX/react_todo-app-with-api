/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { UserWarning } from './UserWarning';
import {
  addTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Todo, Filter, Erors } from './types/Todo';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { ErrorNotification } from './components';

export const App: React.FC = () => {
  const input = useRef<HTMLInputElement>(null);
  const hideErrorTimer = useRef<number | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<number[] | null>(null);
  const [filter, setFilter] = useState(Filter.All);
  const [title, setTitle] = useState('');
  const [loadingError, setLoadingError] = useState({
    queryError: false,
    addError: false,
    todosError: false,
    deleteError: false,
    updateError: false,
  });

  const anyExistingError =
    loadingError.queryError ||
    loadingError.addError ||
    loadingError.todosError ||
    loadingError.deleteError ||
    loadingError.updateError;

  const focusInput = () => (input.current ? input.current.focus() : null);

  const clearError = useCallback(() => {
    if (hideErrorTimer.current) {
      clearTimeout(hideErrorTimer.current);
      hideErrorTimer.current = null;
    }

    setLoadingError({
      queryError: false,
      addError: false,
      todosError: false,
      deleteError: false,
      updateError: false,
    });
  }, []);

  const showError = useCallback(
    (errorType: Erors) => {
      if (hideErrorTimer.current) {
        clearTimeout(hideErrorTimer.current);
      }

      setLoadingError(prev => ({ ...prev, [errorType]: true }));
      hideErrorTimer.current = window.setTimeout(() => {
        clearError();
        hideErrorTimer.current = null;
      }, 3000);
    },
    [clearError],
  );

  const filterTodos = useCallback((todosList: Todo[], filterBy: string) => {
    switch (filterBy) {
      case Filter.Active:
        return todosList.filter(item => !item.completed);
      case Filter.Completed:
        return todosList.filter(item => item.completed);
      default:
        return todosList;
    }
  }, []);

  const visibleTodos = useMemo(
    () => filterTodos(todos, filter),
    [todos, filter, filterTodos],
  );

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    filterBy: Filter,
  ) => {
    event.preventDefault();
    setFilter(filterBy);
  };

  const complateTodo = (todo: Todo) => {
    setDeletingTodoId([todo.id]);

    const complateTodoFromServer = async () => {
      try {
        const response: Todo = await updateTodo({
          ...todo,
          completed: !todo.completed,
        });

        if (!response) {
          throw new Error('Failed to update todo');
        }

        setTodos(prevTodos =>
          prevTodos.map(item =>
            item.id === response.id
              ? { ...response, completed: response.completed }
              : item,
          ),
        );
      } catch {
        showError(Erors.UpdateError);
      } finally {
        setDeletingTodoId(null);
      }
    };

    complateTodoFromServer();
  };

  const complateAllTodo = () => {
    const isEveryCompleted = todos.every(item => item.completed);

    const toggleAllOnServer = async () => {
      const todosToUpdate = todos.filter(
        todo => todo.completed === isEveryCompleted,
      );

      if (todosToUpdate.length === 0) {
        return;
      }

      const updatingIds = todosToUpdate.map(todo => todo.id);

      setDeletingTodoId(updatingIds);

      try {
        const requests = todosToUpdate.map(todo =>
          updateTodo({
            ...todo,
            completed: !todo.completed,
          }),
        );

        const results = await Promise.allSettled(requests);

        setTodos(prev =>
          prev.map(todo => {
            const indexInChanged = updatingIds.indexOf(todo.id);

            if (indexInChanged === -1) {
              return todo;
            }

            const serverResult = results[indexInChanged];

            if (serverResult.status === 'fulfilled') {
              return serverResult.value as Todo;
            }

            return todo;
          }),
        );

        if (results.some(todo => todo.status === 'rejected')) {
          throw new Error();
        }
      } catch {
        showError(Erors.UpdateError);
      } finally {
        setDeletingTodoId(null);
      }
    };

    toggleAllOnServer();
  };

  const removeTodo = (id: number) => {
    setDeletingTodoId([id]);
    const removeTodoFromServer = async () => {
      try {
        const response = (await deleteTodo(id)) as number;

        if (response !== 1) {
          throw new Error();
        }

        setTodos(prev => prev.filter(item => item.id !== id));
      } catch {
        showError(Erors.DeleteError);
      } finally {
        setDeletingTodoId(null);
        focusInput();
      }
    };

    removeTodoFromServer();
  };

  const removeCompletedTodos = () => {
    const completedIds = todos
      .filter(item => item.completed)
      .map(item => item.id);

    setDeletingTodoId(completedIds);
    const removeTodoFromServer = async () => {
      try {
        const response = completedIds.map(async id => deleteTodo(id));
        const res = await Promise.allSettled(response);

        setTodos(prev =>
          prev.filter(item => {
            if (!completedIds.includes(item.id)) {
              return true;
            }

            const result = res.find(
              (_resItem, index) => completedIds[index] === item.id,
            );

            return result?.status !== 'fulfilled';
          }),
        );
        const hasError = res.some(item => item.status === 'rejected');

        if (hasError) {
          throw new Error();
        }
      } catch {
        showError(Erors.DeleteError);
      } finally {
        setDeletingTodoId(null);
        focusInput();
      }
    };

    removeTodoFromServer();
  };

  const checkTodoCompleted = useCallback(() => {
    return todos.some(item => item.completed);
  }, [todos]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length === 0) {
      showError(Erors.QueryError);

      return;
    }

    const createTodo = async () => {
      try {
        const response = await addTodo(title.trim());

        setTodos(prevTodos => [...prevTodos, response]);
        setTempTodo(null);
        setTitle('');
        clearError();
      } catch (error) {
        showError(Erors.AddError);
        setTempTodo(null);
      } finally {
        focusInput();
      }
    };

    setTempTodo({ id: 0, title, completed: false, userId: USER_ID });
    createTodo();
  };

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const todosFromServer = (await getTodos()) as Todo[];

        setTodos(todosFromServer);
        requestAnimationFrame(() => focusInput());
      } catch (error) {
        showError(Erors.TodosError);
      }
    };

    fetchTodos();
  }, [showError]);

  useEffect(() => {
    if (tempTodo === null) {
      focusInput();
    }
  }, [tempTodo]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>
      <div className="todoapp__content">
        <Header
          {...{
            todos,
            title,
            input,
            tempTodo,
            handleTitleChange,
            handleSubmit,
            complateAllTodo,
          }}
        />

        <section className="todoapp__main" data-cy="TodoList">
          <TodoList
            {...{
              visibleTodos,
              tempTodo,
              deletingTodoId,
              removeTodo,
              complateTodo,
              setDeletingTodoId,
              setTodos,
              showError,
            }}
          />
        </section>

        {todos.length > 0 && (
          <Footer
            {...{
              todos,
              filter,
              checkTodoCompleted,
              removeCompletedTodos,
              handleClick,
            }}
          />
        )}
      </div>

      <ErrorNotification {...{ anyExistingError, clearError, loadingError }} />
    </div>
  );
};
