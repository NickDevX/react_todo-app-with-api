import React from 'react';
import { Erors, Todo } from '../../types/Todo';
import { TodoItem } from '../TodoItem';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

type Props = {
  visibleTodos: Todo[];
  tempTodo: Todo | null;
  deletingTodoId: number[] | null;
  removeTodo: (id: number) => void;
  complateTodo: (todo: Todo) => void;
  setDeletingTodoId: (id: number[] | null) => void;
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  showError: (error: Erors) => void;
};

export const TodoList: React.FC<Props> = ({
  visibleTodos,
  tempTodo,
  deletingTodoId,
  removeTodo,
  complateTodo,
  setDeletingTodoId,
  setTodos,
  showError,
}) => {
  return (
    <TransitionGroup component={null}>
      {visibleTodos.map(todoItem => (
        <CSSTransition key={todoItem.id} timeout={300} classNames="item">
          <TodoItem
            key={todoItem.id}
            {...{
              todoItem,
              removeTodo,
              complateTodo,
              deletingTodoId,
              setDeletingTodoId,
              showError,
              setTodos,
            }}
          />
        </CSSTransition>
      ))}
      {tempTodo && (
        <CSSTransition key={0} timeout={300} classNames="temp-item">
          <TodoItem
            {...{
              todoItem: tempTodo,
              removeTodo,
              complateTodo,
              deletingTodoId,
              isTemp: true,
            }}
          />
        </CSSTransition>
      )}
    </TransitionGroup>
  );
};
