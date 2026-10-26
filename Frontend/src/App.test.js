import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './components/Footer';
import SocialLogin from './components/Auth/SocialLogin';

test('footer links to the public reporting pages and shows no placeholder contact details', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

  expect(screen.getByRole('link', { name: /report an animal incident/i })).toHaveAttribute('href', '/report-incident');
  expect(screen.getByRole('link', { name: /lost & found pets/i })).toHaveAttribute('href', '/lost-and-found');
  expect(screen.queryByText(/555/)).not.toBeInTheDocument();
});

test('unfinished social login buttons are hidden by default', () => {
  const { container } = render(<SocialLogin />);
  expect(container).toBeEmptyDOMElement();
});
