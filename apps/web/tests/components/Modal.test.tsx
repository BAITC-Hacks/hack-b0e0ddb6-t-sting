import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '../../src/components/Modal';
describe('modal keyboard and dismissal behavior', () => {
  it('focuses the dialog, traps both tab directions, and restores prior focus', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    const { unmount } = render(
      <Modal title="Выбор" onClose={close}>
        <input aria-label="Название" />
        <button>Последняя кнопка</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: 'Закрыть диалог' });
    const last = screen.getByRole('button', { name: 'Последняя кнопка' });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    screen.getByRole('textbox').focus();
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Tab',
      shiftKey: true,
    });
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'a' });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    fireEvent.click(dialog);
    expect(close).toHaveBeenCalledOnce();
    fireEvent.click(dialog.parentElement!);
    expect(close).toHaveBeenCalledTimes(2);
    fireEvent.click(first);
    expect(close).toHaveBeenCalledTimes(3);
    unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    trigger.remove();
  });
});

describe('modal native tab stops', () => {
  it('treats an unchecked radio group as one tab stop and excludes disabled inputs', () => {
    render(
      <Modal title="Выбор района" onClose={vi.fn()}>
        <input disabled aria-label="Сохраняемое название" />
        <input type="radio" name="district" aria-label="Первый район" />
        <input type="radio" name="district" aria-label="Второй район" />
        <button disabled>Добавить</button>
      </Modal>,
    );
    const close = screen.getByRole('button', { name: 'Закрыть диалог' });
    const first = screen.getByRole('radio', { name: 'Первый район' });
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(first).toHaveFocus();
  });
  it('uses the checked radio and keeps independent unnamed radios in the tab sequence', () => {
    render(
      <Modal title="Радиогруппы" onClose={vi.fn()}>
        <input type="radio" aria-label="Без группы" />
        <input type="radio" name="another" aria-label="Другая группа" />
        <input aria-label="Текст" />
        <input type="radio" name="district" aria-label="Не выбран" />
        <input
          type="radio"
          name="district"
          aria-label="Выбран"
          defaultChecked
        />
      </Modal>,
    );
    const checked = screen.getByRole('radio', { name: 'Выбран' });
    checked.focus();
    fireEvent.keyDown(checked, { key: 'Tab' });
    expect(
      screen.getByRole('button', { name: 'Закрыть диалог' }),
    ).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), {
      key: 'Tab',
      shiftKey: true,
    });
    expect(checked).toHaveFocus();
    const unnamed = screen.getByRole('radio', { name: 'Без группы' });
    unnamed.focus();
    fireEvent.keyDown(unnamed, { key: 'Tab' });
    expect(unnamed).toHaveFocus();
  });
});
