function Footer() {
  return (
    <footer
      className="text-white dark:text-black bg-neutral-900 dark:bg-neutral-100 text-center py-2
        "
    >
      <p>
        © {new Date().getFullYear()} Fruit & Vegetable Detector. All rights
        reserved.
      </p>
    </footer>
  );
}

export default Footer;
