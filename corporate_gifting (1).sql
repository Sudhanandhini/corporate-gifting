-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 16, 2026 at 09:37 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `corporate_gifting`
--

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) NOT NULL,
  `email` varchar(160) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `employee_id` varchar(40) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `first_name`, `last_name`, `email`, `created_at`, `employee_id`) VALUES
(14, 'User 3', 'User 3', 'shilpita.bose@randstad.in', '2026-09-04 04:51:38', NULL),
(15, 'mahesh', 'kumar', 'maheshkumar.d.sunsys@gmail.com', '2026-09-04 09:03:39', NULL),
(16, 'user', 'user', 'gikolop319@crybio.com', '2026-09-12 06:12:50', '45980oiuyr'),
(17, 'user 4', 'user 4', 'support@sunsys.in', '2026-09-15 11:01:10', 'uytio98753'),
(18, 'user 5', 'user 5', 'bahemox519@duidir.com', '2026-09-16 05:44:45', 'rtyio86542');

-- --------------------------------------------------------

--
-- Table structure for table `gifts`
--

CREATE TABLE `gifts` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` varchar(255) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gifts`
--

INSERT INTO `gifts` (`id`, `name`, `description`, `image_url`, `active`, `sort_order`) VALUES
(12, 'The Royal Copper & Almond Brittle Hamper', 'The Royal Copper & Almond Brittle Hamper', '/uploads/gifts/cab0784d8303c4c47f741c2531d38bca.png', 1, 0),
(13, 'Aroma Glow & Hazelnut Roca Luxury Box', 'Aroma Glow & Hazelnut Roca Luxury Box', '/uploads/gifts/11473751a5b2d083c375ceb5c306106e.png', 1, 1),
(14, 'Kitchen Essentials & Sweet Celebration Combo', 'Kitchen Essentials & Sweet Celebration Combo', '/uploads/gifts/586b23a0847c620ab9d23b1cef6d8071.png', 1, 2),
(15, 'Elegant Dining & Kaju Katli Heritage Collection', 'Elegant Dining & Kaju Katli Heritage Collection', '/uploads/gifts/1f6c9eca401fc6fcb57a266970ecfabb.png', 1, 3),
(16, 'Lavender Bloom & Golden Milk Cake Hamper', 'Lavender Bloom & Golden Milk Cake Hamper', '/uploads/gifts/4a528f0a445acc4e7b8d6652de932a7d.png', 1, 4),
(17, 'Cozy Comforts & Crystal Glow Festive Hamper', 'Cozy Comforts & Crystal Glow Festive Hamper', '/uploads/gifts/05d9f652731cbab7babc4605581e68f8.png', 1, 5),
(18, 'The Executive Desk & Welspun Wellness Combo', 'The Executive Desk & Welspun Wellness Combo', '/uploads/gifts/d0ba14aff41e764e333544af994f8fa2.png', 1, 6),
(19, 'Luxe Workspace & Festive Treat Hamper', 'Luxe Workspace & Festive Treat Hamper', '/uploads/gifts/af6c86233fe3fe27e76891821b2be9c0.png', 1, 7);

-- --------------------------------------------------------

--
-- Table structure for table `gift_images`
--

CREATE TABLE `gift_images` (
  `id` int(11) NOT NULL,
  `gift_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `title` varchar(160) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gift_images`
--

INSERT INTO `gift_images` (`id`, `gift_id`, `image_url`, `title`, `sort_order`) VALUES
(51, 12, '/uploads/gifts/cab0784d8303c4c47f741c2531d38bca.png', 'The Royal Copper & Almond Brittle Hamper', 0),
(52, 12, '/uploads/gifts/dabf2b18f61a47d5020a50f6e1c5ff0c.png', 'Coaster set of 2', 1),
(53, 12, '/uploads/gifts/708f2020d75cd512e1c56ce0fe053d8d.png', 'Copper tumbler set bottle', 2),
(54, 12, '/uploads/gifts/3cfa3e43b4356dcc0539dffb3ab3417d.png', 'Loyka Almond Brittle', 3),
(55, 12, '/uploads/gifts/51de750f0f3e7d97cc0d1ad034e4ad74.png', 'Potpuri', 4),
(56, 12, '/uploads/gifts/5af37d746d7fe4739f252cd9c65ed955.png', 'Scented candle', 5),
(57, 12, '/uploads/gifts/ebb60c48c910fc99cdedd1bc2f42dcb7.png', 'Greeting card', 6),
(58, 13, '/uploads/gifts/11473751a5b2d083c375ceb5c306106e.png', 'Aroma Glow & Hazelnut Roca Luxury Box', 0),
(59, 13, '/uploads/gifts/4f0dd856fcf970068bfe05f03854fc78.png', 'Almond roca mix', 1),
(60, 13, '/uploads/gifts/8dafa863203eec3713b5847e88108e2a.png', 'Box', 2),
(61, 13, '/uploads/gifts/1c317973414463f8913440e6aae2bf20.png', 'Coaster set of 2', 3),
(62, 13, '/uploads/gifts/f34eca8e56f03216d26a07101750ddf4.png', 'Copper tumbler set', 4),
(63, 13, '/uploads/gifts/c1710134a3a6a62765dcfeca2b450d80.png', 'Dipuser', 5),
(64, 13, '/uploads/gifts/e92ada419de304869cb1b0b2bbdf380a.png', 'Potpuri', 6),
(65, 13, '/uploads/gifts/eec805a41f54a1756fd19e20a3a3d142.png', 'Greeting card', 7),
(66, 14, '/uploads/gifts/586b23a0847c620ab9d23b1cef6d8071.png', 'Kitchen Essentials & Sweet Celebration Combo', 0),
(67, 14, '/uploads/gifts/34012c586c9f97ded88484d36cededda.png', 'Dining table runner', 1),
(68, 14, '/uploads/gifts/9237f7f90f68bdbd9a69f7c3a6713af0.png', 'Box', 2),
(69, 14, '/uploads/gifts/3f83ba3669fcee0b9fdde4c267986264.png', 'Kaju Katli-100 gm', 3),
(70, 14, '/uploads/gifts/0a4296fa007b4160393364d748d8cf7a.png', 'Scented candle', 4),
(71, 14, '/uploads/gifts/d5a6bdbd9982360f68c449bdd5492c7f.png', 'Sustainable 3 set containers eco', 5),
(72, 14, '/uploads/gifts/274c5ca24a4634feaf6fd9053dd7886c.png', 'Urli brass diya', 6),
(73, 15, '/uploads/gifts/1f6c9eca401fc6fcb57a266970ecfabb.png', 'Elegant Dining & Kaju Katli Heritage Collection', 0),
(74, 15, '/uploads/gifts/a311b9dec62ac97383a3237a7ae3987b.png', 'Four snack plates with four', 1),
(75, 15, '/uploads/gifts/7967a2fc1c05a9620593fd93a9ae84f4.png', 'Box', 2),
(76, 15, '/uploads/gifts/cf3975749536c51f77893fb29d9bf62f.png', 'Dining table runner', 3),
(77, 15, '/uploads/gifts/b4eaea1936c4ce8f552f241e185dc0ce.png', 'Kaju Katli-100 gm', 4),
(78, 15, '/uploads/gifts/06647ee8988ed916d02bd4f6e971ad2e.png', 'Scented candle', 5),
(79, 15, '/uploads/gifts/3421a8c56e82a787adaaaa108d305bce.png', 'Urli brass diya', 6),
(80, 15, '/uploads/gifts/dfedfea3397ceac9684e30482c94e894.png', 'Greeting Card', 7),
(81, 16, '/uploads/gifts/4a528f0a445acc4e7b8d6652de932a7d.png', 'Lavender Bloom & Golden Milk Cake Hamper', 0),
(82, 16, '/uploads/gifts/52151391f1c41290ca22acfac7053e54.png', 'Oil diffuser set', 1),
(83, 16, '/uploads/gifts/af23ef0b0844bf19d5879fd7bdce36ca.png', 'Reflection Diya set of 6', 2),
(84, 16, '/uploads/gifts/1b807f16fc71691d6cfc016a6c3c79c6.png', 'Scented candle', 3),
(85, 16, '/uploads/gifts/745ef44ad8939b84ae18623c862b1a08.png', 'Welspun Double bedsheet', 4),
(86, 16, '/uploads/gifts/bb21771979946f61243c011aa0ba0198.png', 'Box', 5),
(87, 16, '/uploads/gifts/8e58162746489d5398da0c8966e38fa7.png', 'Golden crumble milk cake - 100 g', 6),
(88, 16, '/uploads/gifts/1b5d45cde66cd0e84aa404b3f6368982.png', 'Greeting Card', 7),
(89, 17, '/uploads/gifts/05d9f652731cbab7babc4605581e68f8.png', 'Cozy Comforts & Crystal Glow Festive Hamper', 0),
(90, 17, '/uploads/gifts/1a1b5a39ee3405356352369245f88656.png', '01-02', 1),
(91, 17, '/uploads/gifts/7bb5f6cac17936efff7cc8f5002f758a.png', 'Box', 2),
(92, 17, '/uploads/gifts/4b8353e556129d3f3525eb489efc3d74.png', 'Golden crumble milk cake - 100 g', 3),
(93, 17, '/uploads/gifts/21668bf9d0bda862c5569963c62e35f3.png', 'Reflection Diya set of 6', 4),
(94, 17, '/uploads/gifts/baa59a38a85b4bb20dca939433ca90d0.png', 'Greeting Card', 5),
(95, 18, '/uploads/gifts/d0ba14aff41e764e333544af994f8fa2.png', 'The Executive Desk & Welspun Wellness Combo', 0),
(96, 18, '/uploads/gifts/901fe34e243ba3fe5a524c6e7f342456.png', 'Lamp desk organizer', 1),
(97, 18, '/uploads/gifts/0ae8240495d7c3f62e59d43b951e29da.png', 'Scented candle', 2),
(98, 18, '/uploads/gifts/c92d92e353cf7081415d67d53f4bbebf.png', 'Urli brass diya', 3),
(99, 18, '/uploads/gifts/354ae634441b588903787f1a020f0269.png', 'Welspun Napkins', 4),
(100, 18, '/uploads/gifts/30eb4ac01dbc2124c5943bfd1b79c84f.png', 'Kaju Katli', 5),
(101, 18, '/uploads/gifts/20a12f5b8f773043d960e0cd91e02f8a.png', 'Box', 6),
(102, 18, '/uploads/gifts/7f078ba707b698c6b8fb30c4085e7d06.png', 'Greeting Card', 7),
(103, 19, '/uploads/gifts/af6c86233fe3fe27e76891821b2be9c0.png', 'Luxe Workspace & Festive Treat Hamper', 0),
(104, 19, '/uploads/gifts/4ee08dcc1f69afc092be4ea7850d4e87.png', 'Desk Lamp  Stationery & Mobile Stand', 1),
(105, 19, '/uploads/gifts/ae1ffdba652639d3c052a84dd1fd5282.png', 'Kaju Katli', 2),
(106, 19, '/uploads/gifts/2965a40cdb54f9c0ee460600889f1eec.png', 'Box', 3),
(107, 19, '/uploads/gifts/a6218f3b38e1c8cbad382dba773fd01b.png', 'Scented candle', 4),
(108, 19, '/uploads/gifts/45faada1022192381fc0320e56a9734c.png', 'Urli brass diya', 5),
(109, 19, '/uploads/gifts/1d750ac609ec5383e3893462475e5e58.png', 'Welspun Napkins - 3', 6),
(110, 19, '/uploads/gifts/839a8a6a6d463cbbed738a4c00c060f5.png', 'Greeting Card', 7);

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_code` varchar(20) NOT NULL,
  `gift_id` int(11) DEFAULT NULL,
  `gift_name` varchar(120) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `recipient_name` varchar(160) NOT NULL,
  `last_name` varchar(160) DEFAULT NULL,
  `client_email` varchar(160) NOT NULL,
  `phone` varchar(40) NOT NULL,
  `employee_id` varchar(40) DEFAULT NULL,
  `entity` varchar(160) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(120) NOT NULL,
  `state` varchar(120) NOT NULL,
  `pincode` varchar(20) NOT NULL,
  `gift_message` varchar(255) DEFAULT NULL,
  `status` enum('Submitted','Processing','Completed','Cancelled') NOT NULL DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_code`, `gift_id`, `gift_name`, `quantity`, `recipient_name`, `last_name`, `client_email`, `phone`, `employee_id`, `entity`, `address`, `city`, `state`, `pincode`, `gift_message`, `status`, `created_at`, `deleted_at`) VALUES
(1, 'ORD-1001', NULL, 'Signature Gift Box', 1, 'John Doe', NULL, 'john@company.com', '+91 90000 00001', NULL, NULL, '12 MG Road', 'Bengaluru', 'Karnataka', '560001', 'Congratulations!', 'Processing', '2026-08-28 09:23:09', NULL),
(2, 'ORD-1002', NULL, 'Luxe Hamper', 1, 'Jane Smith', NULL, 'jane@company.com', '+91 90000 00002', NULL, NULL, '48 Residency', 'Bengaluru', 'Karnataka', '560025', 'Well done!', 'Processing', '2026-08-28 09:23:09', NULL),
(3, 'ORD-1003', NULL, 'Signature Gift Box', 2, 'David Kumar', NULL, 'david@company.com', '+91 90000 00003', NULL, NULL, '7 Church St', 'Bengaluru', 'Karnataka', '560001', 'Thank you!', 'Completed', '2026-08-27 09:23:09', NULL),
(4, 'ORD-1004', NULL, 'Desk Kit', 1, 'Aisha Khan', NULL, 'aisha@company.com', '+91 90000 00004', NULL, NULL, '3 Brigade Rd', 'Bengaluru', 'Karnataka', '560001', NULL, 'Completed', '2026-08-26 09:23:09', '2026-09-16 10:53:42'),
(5, 'ORD-1005', NULL, 'Luxe Hamper', 1, 'Rahul Nair', NULL, 'rahul@company.com', '+91 90000 00005', NULL, NULL, '9 Indiranagar', 'Bengaluru', 'Karnataka', '560038', 'Happy holidays', 'Completed', '2026-08-25 09:23:09', NULL),
(7, 'ORD-1006', NULL, 'Luxe Hamper', 1, 'Dupe Test', NULL, 'dupe-test@example.com', '9999999999', NULL, NULL, '123 St', 'Bengaluru', 'Karnataka', '560001', NULL, 'Processing', '2026-08-28 09:47:59', NULL),
(17, 'ORD-1008', 13, 'Aroma Glow & Hazelnut Roca Luxury Box', 1, 'test', 'test', 'maheshkumar.d.sunsys@gmail.com', '9874563215', 'test4432', 'Randstad Digital Private Limited', 'Vijayanager', 'Vijayanager', 'Karnataka', '560040', NULL, 'Submitted', '2026-09-04 09:17:06', '2026-09-16 10:25:38'),
(19, 'ORD-2001', 13, 'Aroma Glow & Hazelnut Roca Luxury Box', 1, 'user 5', 'user 5', 'bahemox519@duidir.com', '9874563215', 'rtyio86542', 'Randstad Enterprise Pvt. Ltd.', 'vijaynagar', 'Tuticorin', 'Tamil Nadu', '628801', NULL, 'Processing', '2026-09-16 05:45:29', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `order_counter`
--

CREATE TABLE `order_counter` (
  `id` tinyint(4) NOT NULL,
  `next_number` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_counter`
--

INSERT INTO `order_counter` (`id`, `next_number`) VALUES
(1, 2001);

-- --------------------------------------------------------

--
-- Table structure for table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` int(11) NOT NULL,
  `email` varchar(160) NOT NULL,
  `code` char(5) NOT NULL,
  `expires_at` datetime NOT NULL,
  `consumed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `email`, `code`, `expires_at`, `consumed`, `created_at`) VALUES
(1, 'support@sunsys.in', '49057', '2026-08-28 15:05:14', 0, '2026-08-28 09:25:14'),
(2, 'support@sunsys.in', '80061', '2026-08-28 15:06:56', 1, '2026-08-28 09:26:56'),
(3, 'support@sunsys.in', '56238', '2026-08-28 15:07:44', 0, '2026-08-28 09:27:44'),
(4, 'support@sunsys.in', '42597', '2026-08-28 15:08:33', 0, '2026-08-28 09:28:33'),
(5, 'support@sunsys.in', '80208', '2026-08-28 15:09:18', 1, '2026-08-28 09:29:18'),
(6, 'support@sunsys.in', '70410', '2026-08-28 15:12:30', 1, '2026-08-28 09:32:30'),
(7, 'dupe-test@example.com', '12808', '2026-08-28 15:27:55', 0, '2026-08-28 09:47:55'),
(8, 'dupe-test@example.com', '41025', '2026-08-28 15:27:59', 0, '2026-08-28 09:47:59'),
(9, 'dupe-test2@example.com', '32015', '2026-08-28 15:28:08', 0, '2026-08-28 09:48:08'),
(10, 'dupe-test@example.com', '32527', '2026-08-28 15:28:36', 1, '2026-08-28 09:48:36'),
(11, 'support@sunsys.in', '23828', '2026-08-28 15:29:18', 1, '2026-08-28 09:49:18'),
(12, 'sunsys06@gmail.com', '38270', '2026-08-28 15:33:43', 1, '2026-08-28 09:53:43'),
(13, 'sunsys06@gmail.com', '46781', '2026-08-28 15:48:05', 1, '2026-08-28 10:08:05'),
(14, 'sunsys06@gmail.com', '28107', '2026-08-28 15:49:28', 1, '2026-08-28 10:09:28'),
(15, 'sunsys06@gmail.com', '37311', '2026-08-28 16:02:51', 0, '2026-08-28 10:22:51'),
(16, 'sunsys06@gmail.com', '56628', '2026-08-28 16:03:38', 1, '2026-08-28 10:23:38'),
(17, 'sunsys06@gmail.com', '63175', '2026-08-28 16:12:02', 1, '2026-08-28 10:32:02'),
(18, 'sunsys06@gmail.com', '71408', '2026-08-28 16:17:53', 1, '2026-08-28 10:37:53'),
(19, 'sunsys06@gmail.com', '55094', '2026-08-31 10:37:01', 0, '2026-08-31 04:57:01'),
(20, 'sunsys06@gmail.com', '34222', '2026-08-31 10:41:11', 1, '2026-08-31 05:01:11'),
(21, 'support@sunsys.in', '64303', '2026-09-02 14:32:48', 0, '2026-09-02 08:52:49'),
(22, 'maheshkumar.d.sunsys@gmail.com', '21573', '2026-09-02 14:33:14', 1, '2026-09-02 08:53:14'),
(23, 'sunsys06@gmail.com', '34453', '2026-09-02 14:38:24', 1, '2026-09-02 08:58:24'),
(24, 'support@sunsys.in', '37828', '2026-09-02 14:59:50', 1, '2026-09-02 09:19:50'),
(25, 'maheshkumar.d.sunsys@gmail.com', '70952', '2026-09-02 15:09:06', 1, '2026-09-02 09:29:06'),
(26, 'maheshkumar.d.sunsys@gmail.com', '54195', '2026-09-02 15:11:08', 1, '2026-09-02 09:31:08'),
(27, 'sudhanandhinis@gmail.com', '92609', '2026-09-02 15:44:32', 1, '2026-09-02 10:04:32'),
(28, 'sudhanandhinis@gmail.com', '82092', '2026-09-02 16:25:11', 1, '2026-09-02 10:45:11'),
(29, 'miweyi9219@mapsguy.com', '64639', '2026-09-02 17:27:09', 1, '2026-09-02 11:47:09'),
(30, 'xalaw93147@mapsguy.com', '69189', '2026-09-03 10:18:01', 1, '2026-09-03 04:38:01'),
(31, 'sudhanandhinis@gmail.com', '81808', '2026-09-03 15:29:54', 0, '2026-09-03 09:49:54'),
(32, 'sudhanandhinis@gmail.com', '66406', '2026-09-03 15:30:19', 0, '2026-09-03 09:50:19'),
(33, 'sudhanandhinis@gmail.com', '63427', '2026-09-03 15:30:49', 0, '2026-09-03 09:50:49'),
(34, 'sudhanandhinis@gmail.com', '18092', '2026-09-03 15:30:56', 1, '2026-09-03 09:50:56'),
(35, 'vytaxyfu@denipl.net', '32190', '2026-09-03 15:35:28', 1, '2026-09-03 09:55:28'),
(36, 'kohori@denipl.net', '81865', '2026-09-03 19:00:05', 1, '2026-09-03 13:20:05'),
(37, 'kohori@denipl.net', '74099', '2026-09-04 09:34:35', 1, '2026-09-04 03:54:35'),
(38, 'kohori@denipl.net', '84082', '2026-09-04 10:00:50', 1, '2026-09-04 04:20:50'),
(39, 'maheshkumar.d.sunsys@gmail.com', '89795', '2026-09-04 14:43:43', 1, '2026-09-04 09:03:43'),
(40, 'gikolop319@crybio.com', '99325', '2026-09-12 11:52:54', 1, '2026-09-12 06:12:54'),
(41, 'gikolop319@crybio.com', '80341', '2026-09-12 12:06:37', 1, '2026-09-12 06:26:37'),
(42, 'gikolop319@crybio.com', '15580', '2026-09-12 12:12:35', 1, '2026-09-12 06:32:35'),
(43, 'maheshkumar.d.sunsys@gmail.com', '36167', '2026-09-15 16:36:49', 1, '2026-09-15 10:56:49'),
(44, 'support@sunsys.in', '60120', '2026-09-15 16:41:39', 1, '2026-09-15 11:01:39'),
(45, 'support@sunsys.in', '33695', '2026-09-16 09:50:21', 1, '2026-09-16 04:10:21'),
(46, 'support@sunsys.in', '56029', '2026-09-16 11:09:36', 1, '2026-09-16 05:29:36'),
(47, 'support@sunsys.in', '31977', '2026-09-16 11:15:51', 1, '2026-09-16 05:35:51'),
(48, 'bahemox519@duidir.com', '45489', '2026-09-16 11:24:52', 1, '2026-09-16 05:44:52');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `date_from` date DEFAULT NULL,
  `date_to` date DEFAULT NULL,
  `status_filter` varchar(20) DEFAULT NULL,
  `search_filter` varchar(160) DEFAULT NULL,
  `row_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `filename`, `file_url`, `date_from`, `date_to`, `status_filter`, `search_filter`, `row_count`, `created_at`) VALUES
(8, 'employees-1789536996806-0c12919a.xlsx', '/uploads/reports/employees-1789536996806-0c12919a.xlsx', NULL, NULL, NULL, NULL, 7, '2026-09-16 05:36:36'),
(9, 'orders-1789537653142-27fa13ea.xlsx', '/uploads/reports/orders-1789537653142-27fa13ea.xlsx', '2026-07-01', '2026-09-16', NULL, NULL, 6, '2026-09-16 05:47:33');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `uq_employees_employee_id` (`employee_id`);

--
-- Indexes for table `gifts`
--
ALTER TABLE `gifts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `gift_images`
--
ALTER TABLE `gift_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_gift_images_gift` (`gift_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_code` (`order_code`),
  ADD KEY `fk_orders_gift` (`gift_id`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_created` (`created_at`),
  ADD KEY `idx_orders_deleted` (`deleted_at`);

--
-- Indexes for table `order_counter`
--
ALTER TABLE `order_counter`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_otp_email` (`email`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `gifts`
--
ALTER TABLE `gifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `gift_images`
--
ALTER TABLE `gift_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=111;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `gift_images`
--
ALTER TABLE `gift_images`
  ADD CONSTRAINT `fk_gift_images_gift` FOREIGN KEY (`gift_id`) REFERENCES `gifts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_gift` FOREIGN KEY (`gift_id`) REFERENCES `gifts` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
