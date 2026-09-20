import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

interface HeaderOverrides {
    onRunCode?: () => void;
    onStopExecution?: () => void;
    onSaveProject?: () => void;
    onOpenProject?: () => void;
    onNewProject?: () => void;
    onToggleCode?: () => void;
    onDebugCode?: () => void;
    isRunning?: boolean;
    isDebugging?: boolean;
    isCodeHidden?: boolean;
}

function renderHeader(overrides: HeaderOverrides = {}) {
    const props = {
        onRunCode: vi.fn(),
        onStopExecution: vi.fn(),
        onSaveProject: vi.fn(),
        onOpenProject: vi.fn(),
        onNewProject: vi.fn(),
        onToggleCode: vi.fn(),
        onDebugCode: vi.fn(),
        isRunning: false,
        isDebugging: false,
        isCodeHidden: false,
        ...overrides,
    };
    const utils = render(<Header {...props} />);
    return { props, ...utils };
}

describe('Header', () => {
    describe('direct buttons', () => {
        it('calls onRunCode when "Запуск" button is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();

            await user.click(screen.getByRole('button', { name: /запуск/i }));

            expect(props.onRunCode).toHaveBeenCalledTimes(1);
        });

        it('calls onDebugCode when "Отладка" button is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();

            await user.click(screen.getByRole('button', { name: /^Отладка/i }));

            expect(props.onDebugCode).toHaveBeenCalledTimes(1);
        });

        it('calls onToggleCode when code toggle icon is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();

            await user.click(screen.getByAltText('Скрыть код'));

            expect(props.onToggleCode).toHaveBeenCalledTimes(1);
        });

        it('uses "Показать код" alt text when code is hidden', () => {
            renderHeader({ isCodeHidden: true });

            expect(screen.getByAltText('Показать код')).toBeInTheDocument();
        });

        it('uses "Скрыть код" alt text when code is visible', () => {
            renderHeader({ isCodeHidden: false });

            expect(screen.getByAltText('Скрыть код')).toBeInTheDocument();
        });
    });

    describe('projects menu', () => {
        it('does not render dropdown items initially', () => {
            renderHeader();

            expect(screen.queryByRole('button', { name: /^Открыть/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Создать проект/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /^Сохранить/i })).not.toBeInTheDocument();
        });

        it('opens dropdown when "Проекты" button is clicked', async () => {
            const user = userEvent.setup();
            renderHeader();

            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            expect(screen.getByRole('button', { name: /^Открыть/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Создать проект/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /^Сохранить/i })).toBeInTheDocument();
        });

        it('closes dropdown on second "Проекты" click', async () => {
            const user = userEvent.setup();
            renderHeader();
            const projectsButton = screen.getByRole('button', { name: 'Проекты' });

            await user.click(projectsButton);
            await user.click(projectsButton);

            expect(screen.queryByRole('button', { name: /^Открыть/i })).not.toBeInTheDocument();
        });

        it('renders keyboard shortcuts in dropdown items', async () => {
            const user = userEvent.setup();
            renderHeader();

            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
            expect(screen.getByText('Alt+N')).toBeInTheDocument();
            expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
        });

        it('calls onOpenProject and closes menu when "Открыть" is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();
            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            await user.click(screen.getByRole('button', { name: /^Открыть/i }));

            expect(props.onOpenProject).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('button', { name: /^Открыть/i })).not.toBeInTheDocument();
        });

        it('calls onNewProject and closes menu when "Создать проект" is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();
            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            await user.click(screen.getByRole('button', { name: /Создать проект/i }));

            expect(props.onNewProject).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('button', { name: /Создать проект/i })).not.toBeInTheDocument();
        });

        it('calls onSaveProject and closes menu when "Сохранить" is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();
            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            await user.click(screen.getByRole('button', { name: /^Сохранить/i }));

            expect(props.onSaveProject).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('button', { name: /^Сохранить/i })).not.toBeInTheDocument();
        });

        it('does not call any project callback when only toggling the menu', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader();

            await user.click(screen.getByRole('button', { name: 'Проекты' }));

            expect(props.onOpenProject).not.toHaveBeenCalled();
            expect(props.onNewProject).not.toHaveBeenCalled();
            expect(props.onSaveProject).not.toHaveBeenCalled();
        });
    });

    describe('ExecutionStatus visibility', () => {
        it('hides ExecutionStatus when idle', () => {
            renderHeader({ isRunning: false, isDebugging: false });

            const status = document.querySelector('#code_execution_status');
            expect(status).not.toHaveClass('active');
        });

        it('shows "Выполняется" when isRunning is true', () => {
            renderHeader({ isRunning: true });

            const status = document.querySelector('#code_execution_status');
            expect(status).toHaveClass('active');
            expect(status).toHaveTextContent('Выполняется');
        });

        it('shows "Отладка" in status when isDebugging is true', () => {
            renderHeader({ isDebugging: true });

            const status = document.querySelector('#code_execution_status');
            expect(status).toHaveClass('active');
            expect(status).toHaveTextContent('Отладка');
        });

        it('shows "Отладка" when both isRunning and isDebugging are true', () => {
            renderHeader({ isRunning: true, isDebugging: true });

            const status = document.querySelector('#code_execution_status');
            expect(status).toHaveClass('active');
            expect(status).toHaveTextContent('Отладка');
        });

        it('calls onStopExecution when stop icon is clicked', async () => {
            const user = userEvent.setup();
            const { props } = renderHeader({ isRunning: true });

            await user.click(screen.getByAltText('Остановить'));

            expect(props.onStopExecution).toHaveBeenCalledTimes(1);
        });
    });
});
