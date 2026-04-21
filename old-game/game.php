<?php
require_once("standard.php");
$wsstandard = new WsStandard();
define('HOST_NAME',"localhost"); 
define('PORT',$wsstandard->getPort());
$null = NULL;
$life = true;
$timeChange = 0;
$allPlayers = 0;

$playersToWant = -1;

$collisionArray = array(4, 3, 2, 1, 0, -1, -2, -3);

function randomLook()
{
	$looks = array(0, 10, 20, 30, 40, 51, 61, 71, 81);
	$index = rand(0, 7);
	return $looks[$index];
}

function CircleCollision($p1x, $p1y, $r1, $p2x, $p2y, $r2) {
	$a = $r1 + $r2;
	$x = $p1x - $p2x;
	$y = $p1y - $p2y;

	if ($a > sqrt(($x * $x) + ($y * $y))) {
		return true;
	} else {
		return false;
	}
}
function createRandomName()
{
	$name = '';
	$rand = rand(3, 8);
	for($i = 0; $i < $rand; $i++)
	{
		$name .= chr(rand(97, 122));
	}
	return $name;
}
function toengnickname($name)
{
	$string = '';
	for($i = 0; $i < strlen($name); $i++)
	{
		$ord = ord($name[$i]);
		if(($ord < 33) || ($ord > 126))
		{
			$ord = 80;
		}
		$string .= chr($ord);
	}
	return $name;
}


$leaderboardSize = 10;
$size = 1369;
//max size = 128
$rubinX = $size / 2;
$rubinY = $size / 2;
$rubinHP = rand(1, 10);

$socketResource = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socketResource, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socketResource, "0.0.0.0", PORT);
socket_listen($socketResource);
$clientSocketArray = array(array($socketResource, array('size' => 20, 'x' => $size / 2, 'y' => $size / 2, 'points' => 10, 'kierunek' => rand(0, 100) / 10, 'kierunekTo' => rand(0, 3), 'life' => false, 'password' => '', 'vectors' => array(), 'look' => rand(33, 127), 'server' => true, 'eat' => 0, 'totalEaten' => 0, 'dieTimeEnd' => 0, 'antennae' => 0, 'name' => createRandomName(), 'room' => '')));
$bots = array();

for($i = 0; $i < 0; $i++)
{
	//$clientSocketArray[] = array($socketResource, array('size' => 20, 'x' => rand($size * 0.1, $size * 0.9), 'y' => rand($size * 0.1, $size * 0.9), 'points' => 0, 'kierunek' => rand(0, 100) / 10, 'kierunekTo' => rand(0, 100) / 10, 'life' => true, 'password' => '', 'vectors' => array(), 'look' => rand(33, 127)));
}

$points = array();
$time = microtime(true);

for($i = 0; $i < $size * $size / 100000; $i++)
{
	$points[] = array('x' => rand($size * 0.05, $size * 0.95), 'y' => rand($size * 0.05, $size * 0.95));
}

// ### THE FIX IS APPLIED HERE ###
function safe_socket_recv($sock, &$buffer, $length = 1024) {
    $bytes = @socket_recv($sock, $buffer, $length, 0);

    if ($bytes === false || $bytes === 0) {
        $err = socket_last_error($sock);
        $msg = socket_strerror($err);
        echo "socket_recv() error [$err]: $msg\n";

        socket_clear_error($sock);
        // The socket_close($sock) line has been REMOVED to prevent the fatal error.
        return false;
    }

    return $bytes;
}

while ($life) {
	$timeChange += microtime(true) - $time;
	$time = microtime(true);
	
	$newSocketArray = array();
	foreach ($clientSocketArray as $clientData) {
		$isPlayer = !$clientData[1]['server'];
		$isServer = $clientData[1]['server'];

		if ($isServer) {
			$newSocketArray[] = $clientData[0];
		} 
		elseif ($isPlayer && $clientData[1]['life'] && $clientData[1]['connected']) {
			$newSocketArray[] = $clientData[0];
		}
	}

	socket_select($newSocketArray, $null, $null, 0, 10); 
	if (in_array($socketResource, $newSocketArray)) {
		$newSocket = socket_accept($socketResource);
		
		$clientSocketArray[] = array($newSocket, array('size' => 20, 'x' => rand($size * 0.1, $size * 0.9), 'y' => rand($size * 0.1, $size * 0.9), 'points' => 10, 'kierunek' => rand(0, 100) / 10, 'kierunekTo' => rand(0, 3), 'life' => true, 'password' => '0', 'vectors' => array(), 'look' => rand(33, 127), 'server' => false, 'eat' => 0, 'dieTimeEnd' => 0, 'antennae' => 0, 'name' => '', 'room' => '', 'theBestRank' => 100, 'connected' => true));
		
		$header = socket_read($newSocket, 1024);
		$wsstandard->doHandshake($header, $newSocket, HOST_NAME, PORT);
		
		$newSocketIndex = array_search($socketResource, $newSocketArray);
		unset($newSocketArray[$newSocketIndex]);
	}
    
	// ### REFACTORED MESSAGE AND DISCONNECTION LOOP ###
	foreach ($newSocketArray as $newSocketArrayResource) {
		// Try to receive data.
		$bytes = @socket_recv($newSocketArrayResource, $socketData, 2048, 0);

		if ($bytes > 0) { // Data was received successfully
			$socketMessage = $wsstandard->unseal($socketData);
			
			if($socketMessage[0] == 'p' /* set password */)
			{
				$password = substr($socketMessage, 1, strlen($socketMessage) - 1);
				for($i = 0; $i < count($clientSocketArray); $i++)
				{
					if($clientSocketArray[$i][1]['password'] == '0')
					{
						$clientSocketArray[$i][1]['password'] = $password;
						$i = count($clientSocketArray);
					}
				}
			} else if ($socketMessage[0] == 'm' /* move */) {
				$password = substr($socketMessage, 1, 10);
				for($i = 0; $i < count($clientSocketArray); $i++)
				{
					if($clientSocketArray[$i][1]['password'] == $password)
					{
						$kierunekTo = (int)substr($socketMessage, 11, strlen($socketMessage) - 11);
						$kierunekTo /= -100;
						$clientSocketArray[$i][1][/*'kierunek'*/'kierunekTo'] = $kierunekTo;
					}
				}
			} else if ($socketMessage[0] == 's' /* speed up */) {
				$password = substr($socketMessage, 1, 10);
				for($i = 0; $i < count($clientSocketArray); $i++)
				{
					if($clientSocketArray[$i][1]['password'] == $password)
					{
						if(($clientSocketArray[$i][1]['points'] > 15) && count($clientSocketArray[$i][1]['vectors']) < 1)
						{
							$clientSocketArray[$i][1]['vectors'][0] = array('size' => 0, 'x' => sin($clientSocketArray[$i][1]['kierunek']) * $clientSocketArray[$i][1]['size'], 'y' => cos($clientSocketArray[$i][1]['kierunek']) * $clientSocketArray[$i][1]['size']);
							for($j = 0; $j < ceil($clientSocketArray[$i][1]['size'] / 30) + 1; $j++)
							{
								$clientSocketArray[$i][1]['eat']--;
								$clientSocketArray[$i][1]['points'] -= rand(1, 3);
								$points[] = array('x' => ($clientSocketArray[$i][1]['x'] + ($clientSocketArray[$i][1]['vectors'][0]['x'] * -2) + rand(0, 10)), 'y' => ($clientSocketArray[$i][1]['y'] + ($clientSocketArray[$i][1]['vectors'][0]['y'] * -2) + rand(0, 10)));
							}
						}
					}
				}
			} else if ($socketMessage[0] == 'n' /* set name */) {
				$password = substr($socketMessage, 1, 10);
				for($i = 0; $i < count($clientSocketArray); $i++)
				{
					if($clientSocketArray[$i][1]['password'] == $password)
					{
						$name = substr($socketMessage, 11, strlen($socketMessage) - 11);
						if (!preg_match('/^[a-zA-Z]+$/', $name) || $name == '') {
							$name = "nie_mam_nicku!";
						}
						$room = createRandomName();
						if(count(explode(':', $name)) > 1 && strlen(explode(':', $name)[0]) > 0)
						{
							$room = explode(':', $name)[1];
						}
						echo '   ' . $room . '   ';
						$clientSocketArray[$i][1]['name'] = explode(':', $name)[0];
						$clientSocketArray[$i][1]['room'] = $room;
						for($w = 0; $w < count($clientSocketArray); $w ++)
						{
							if($clientSocketArray[$w][1]['room'] == $room)
							{
								$clientSocketArray[$i][1]['x'] = $clientSocketArray[$w][1]['x'] + rand(200, 600) * (rand(0, 1) == 0 ? -1 : 1);
								$clientSocketArray[$i][1]['y'] = $clientSocketArray[$w][1]['y'] + rand(200, 600) * (rand(0, 1) == 0 ? -1 : 1);
								$w = 1000;
							}
						}
					}
				}
			} else if ($socketMessage[0] == 'l' /* set look */) {
				$password = substr($socketMessage, 1, 10);
				for($i = 0; $i < count($clientSocketArray); $i++)
				{
					if($clientSocketArray[$i][1]['password'] == $password)
					{
						$lookArray = explode(' ', substr($socketMessage, 11, strlen($socketMessage) - 11));
						$look = $lookArray[0];
						$al = (int)$lookArray[1];
						$ac = (int)$lookArray[2];

						$antennae = $al + ($ac * 7);
						$clientSocketArray[$i][1]['look'] = (int)$look;
						$clientSocketArray[$i][1]['antennae'] = $antennae;
					}
				}
			}
		} else { // $bytes is 0 or false, indicating a disconnection
			// Handle the disconnection cleanly
			for ($i = 0; $i < count($clientSocketArray); $i++) {
				if (isset($clientSocketArray[$i][0]) && $clientSocketArray[$i][0] == $newSocketArrayResource) {
					if (is_resource($clientSocketArray[$i][0])) {
						socket_close($clientSocketArray[$i][0]);
					}
					$clientSocketArray[$i][1]['connected'] = false;
					break; // Found the player, exit loop
				}
			}
		}
	} // End of the refactored loop
    
	if($timeChange > 0.03)
	{
		$allPlayers = 0;
		//obsluga graczy
		for($i = 0; $i < count($clientSocketArray); $i++)
		{
			if($clientSocketArray[$i][1]['life'])
			{
				if(rand(0, round($timeChange * 10000)) == 1)
				{
					$clientSocketArray[$i][1]['theBestRank'] = 10000;
				}
				if(!$clientSocketArray[$i][1]['server'])
				{
					$allPlayers ++;
				}
				$clientSocketArray[$i][1]['size'] += $timeChange * 1.5;
				$speed = (0.128 - (20 / $clientSocketArray[$i][1]['size'])) * $timeChange * -10;

				$k = $clientSocketArray[$i][1]['kierunek'];
				$kt = $clientSocketArray[$i][1]['kierunekTo'];
				if(abs($k - $kt) < $speed) {
					$clientSocketArray[$i][1]['kierunek'] = $clientSocketArray[$i][1]['kierunekTo'];
				} else {
					$minus = true;
					if((abs($k) - (abs($kt) - M_PI * 2)) < M_PI)
					{
						$minus = false;
					}
					if((($k > $kt || ($k - ($kt - M_PI * 2)) < M_PI)) && $minus)
					{
						$clientSocketArray[$i][1]['kierunek'] -= $speed;
					} else {
						$clientSocketArray[$i][1]['kierunek'] += $speed;
					}
					if($clientSocketArray[$i][1]['kierunek'] < (M_PI * -2))
					{
						$clientSocketArray[$i][1]['kierunek'] += M_PI * 2;
					}
					if($clientSocketArray[$i][1]['kierunek'] > 0)
					{
						$clientSocketArray[$i][1]['kierunek'] -= M_PI * 2;
					}
				}
				if(!$clientSocketArray[$i][1]['server'] && $rubinHP > 0 && CircleCollision($clientSocketArray[$i][1]['x'], $clientSocketArray[$i][1]['y'], $clientSocketArray[$i][1]['size'] * 2, $rubinX, $rubinY, 150))
				{
					$nowRand = rand(10, 20) / 10;
					$clientSocketArray[$i][1]['points'] += $nowRand * 15;
					$clientSocketArray[$i][1]['vectors'][] = array('size' => $nowRand * -2, 'x' => rand(30, 50) * (rand(0, 1) * 2 - 1), 'y' => rand(30, 50) * (rand(0, 1) * 2 - 1));
					$rubinHP -= $nowRand;
					if($rubinHP < 2)
					{
						$rubinHP = 0;
					}
				}
				if($clientSocketArray[$i][1]['size'] > 120)
				{
					$clientSocketArray[$i][1]['life'] = false;
					$clientSocketArray[$i][1]['dieTimeEnd'] = $time + 3;
					for($j = 0; $j < min(max(16, $clientSocketArray[$i][1]['eat']), 100); $j++)
					{
						$randToCircle = rand(0, 360);
						$points[] = array('x' => $clientSocketArray[$i][1]['x'] + sin($randToCircle) * 256, 'y' => $clientSocketArray[$i][1]['y'] + cos($randToCircle) * 256);
					}
					$message = '         DIE&' . round($clientSocketArray[$i][1]['points']) . '&' . $clientSocketArray[$i][1]['totalEaten'];
					
					if (isset($clientSocketArray[$i][1]['connected']) && $clientSocketArray[$i][1]['connected']) {
						$message = $wsstandard->seal($message);
						$messageLength = strlen($message);
						@socket_write($clientSocketArray[$i][0], $message, $messageLength);
					}

					$rubinHP = 10;
					$rubinX = $clientSocketArray[$i][1]['x'] + rand(-100, 100);
					$rubinY = $clientSocketArray[$i][1]['y'] + rand(-100, 100);
				}
				foreach($clientSocketArray[$i][1]['vectors'] as $t)
				{
					$clientSocketArray[$i][1]['x'] += $t['x'];
					$clientSocketArray[$i][1]['y'] += $t['y'];
					$clientSocketArray[$i][1]['size'] += $t['size'];
					$index = array_search($t, $clientSocketArray[$i][1]['vectors']);
					$clientSocketArray[$i][1]['vectors'][$index]['x'] = $t['x'] / 1.14;
					$clientSocketArray[$i][1]['vectors'][$index]['y'] = $t['y'] / 1.14;
					$clientSocketArray[$i][1]['vectors'][$index]['size'] = $t['size'] / 1.14;
					if(($t['x'] < 2 && $t['y'] < 2) && ($t['x'] > -2 && $t['y'] > -2))
					{
						unset($clientSocketArray[$i][1]['vectors'][$index]);
					}
				}
				$x = $clientSocketArray[$i][1]['x'];
				$y = $clientSocketArray[$i][1]['y'];
				$clientSocketArray[$i][1]['size'] = min(max($clientSocketArray[$i][1]['size'], 20), 129);
				if($x < 0 || $y < 0 || $x > $size || $y > $size)
				{
					$obrot = atan2($x - $size / 2, $y - $size / 2) * (1);
					$clientSocketArray[$i][1]['vectors'][] = array('size' => 1, 'x' => sin($obrot) * -150, 'y' => cos($obrot) * -150);
				}
				if(count($clientSocketArray[$i][1]['vectors']) < 1)
				{
					$clientSocketArray[$i][1]['x'] += sin($clientSocketArray[$i][1]['kierunek']) * $timeChange * 250;
					$clientSocketArray[$i][1]['y'] += cos($clientSocketArray[$i][1]['kierunek']) * $timeChange * 250;
				}
			}
		}
		//obsluga botow
		for($i = 0; $i < count($bots); $i++)
		{
			if($bots[$i]['life'])
			{
				$allPlayers ++;
				$bots[$i]['size'] += $timeChange * 3.333;
				$speed = (0.128 - (20 / $bots[$i]['size'])) * $timeChange * -10;

				$k = $bots[$i]['kierunek'];
				$theNearest = 20000;
				$rotate = 0;
				$addVector = false;
				foreach($points as $point)
				{
					if(abs($bots[$i]['x'] - $point['x']) < 1000 && abs($bots[$i]['y'] - $point['y']) < 1000)
					{
						$positionX = round($bots[$i]['x'] - $point['x']);
						$positionY = round($bots[$i]['y'] - $point['y']);
						if(abs(($positionX)) < $bots[$i]['size'] * 2.5)
						{
							if(abs(($positionY)) < $bots[$i]['size'] * 2.5 && $bots[$i]['life'])
							{
								if(count($points) < $size * $size / 100000)
								{
									$points[] = array('x' => rand($size * 0.1, $size * 0.9), 'y' => rand($size * 0.1, $size * 0.9));
								}
								unset($points[array_search($point, $points)]);
								$bots[$i]['points'] += (rand(0, 30) / 10);
								$bots[$i]['eat'] ++;
							}
						}
						$near = sqrt($positionX * $positionX + $positionY * $positionY);
						$nowrotate = atan2($positionY, $positionX);
						if((abs(abs(($nowrotate % 6) - ($k % 6)) % 6) < 1 && $near < $theNearest) || $theNearest > 400)
						{
							$rotate = $nowrotate;
							$theNearest = $near;
						}
					}
				}
				for($j = 0; $j < count($bots); $j ++)
				{
					if($bots[$j]['life'] && $bots[$i]['life'] && $bots[$j]['points'] != $bots[$i]['points'] && CircleCollision($bots[$j]['x'], $bots[$j]['y'], $bots[$j]['size'] * 2, $bots[$i]['x'], $bots[$i]['y'], $bots[$i]['size'] * 2))
					{
						$atan2 = atan2($bots[$i]['x'] - $bots[$j]['x'], $bots[$i]['y'] - $bots[$j]['y']);
						$r2 = $bots[$j]['kierunek'];
						$bots[$i]['vectors'][] = array('size' => /*max($atan2 - $r2, 0) * -1*/-2, 'x' => sin($bots[$i]['kierunek']) * -30, 'y' => cos($bots[$i]['kierunek']) * -30);
					}
				}
				if(abs($rubinY - $bots[$i]['y']) < 20000 && abs($rubinX - $bots[$i]['x']) < 20000 && $rubinHP > -1)
				{
					$rotate = atan2($bots[$i]['y'] - $rubinY, $bots[$i]['x'] - $rubinX) * -1- pi() / 2;
				}
				for($j = 0; $j < count($clientSocketArray); $j ++)
				{
					$thisPlayerLife = $clientSocketArray[$j][1]['life'];
					$subX = round(abs($bots[$i]['x'] - $clientSocketArray[$j][1]['x']));
					$subY = round(abs($bots[$i]['y'] - $clientSocketArray[$j][1]['y']));
					if($thisPlayerLife && ($subX < 400) && ($subY < 400))
					{
						$atan2 = atan2($subY, $subX) * -1 - pi() / 2;
						if(count($bots[$i]['vectors']) == 0)
						{
							$rotate = $atan2;
							$bots[$i]['kierunek'] = $atan2;
							$bots[$i]['vectors'][] = array('size' => 0, 'x' => sin($atan2) * -64, 'y' => cos($atan2) * -64);
							$addVector = true;
						}
					}
				}
				if($rotate > 0)
				{
					$rotate = $rotate - pi() * 2;
				}
				$rotate = 0;
				//$bots[$i]['kierunek'] = $rotate;
				if(count($bots[$i]['vectors']) == 0 && $addVector)
				{
					$bots[$i]['vectors'][] = array('size' => 0, 'x' => sin($rotate) * 64, 'y' => cos($rotate) * 64);
				}
				$bots[$i]['kierunekTo'] = $rotate;

				$k = $bots[$i]['kierunek'];
				$kt = $bots[$i]['kierunekTo'];
				if(abs($k - $kt) < $speed)
				{
					
				} else {
					$minus = true;
					if((abs($k) - (abs($kt) - M_PI * 2)) < M_PI)
					{
						$minus = false;
					}
					if((($k > $kt || ($k - ($kt - M_PI * 2)) < M_PI)) && $minus)
					{
						$bots[$i]['kierunek'] -= $speed;
					} else {
						$bots[$i]['kierunek'] += $speed;
					}
					if($bots[$i]['kierunek'] < (M_PI * -2))
					{
						$bots[$i]['kierunek'] += M_PI * 2;
					}
					if($bots[$i]['kierunek'] > 0)
					{
						$bots[$i]['kierunek'] -= M_PI * 2;
					}
				}
				if($rubinHP > 0 && CircleCollision($bots[$i]['x'], $bots[$i]['y'], $bots[$i]['size'] * 2, $rubinX, $rubinY, 150))
				{
					$nowRand = rand(10, 20) / 10;
					$bots[$i]['points'] += $nowRand * 15;
					$bots[$i]['vectors'][] = array('size' => $nowRand * -2, 'x' => rand(30, 50) * (rand(0, 1) * 2 - 1), 'y' => rand(30, 50) * (rand(0, 1) * 2 - 1));
					$rubinHP -= $nowRand;
					if($rubinHP < 2)
					{
						$rubinHP = 0;
					}
				}
				if($bots[$i]['size'] > 128)
				{
					$bots[$i]['life'] = false;
					for($j = 0; $j < min(max(16, $bots[$i]['eat']), 100); $j++)
					{
						$randToCircle = rand(0, 360);
						$points[] = array('x' => $bots[$i]['x'] + sin($randToCircle) * 256, 'y' => $bots[$i]['y'] + cos($randToCircle) * 256);
					}
					$rubinHP = 10;
					$rubinX = $bots[$i]['x'] + rand(-100, 100);
					$rubinY = $bots[$i]['y'] + rand(-100, 100);
				}
				foreach($bots[$i]['vectors'] as $t)
				{
					$bots[$i]['x'] += $t['x'];
					$bots[$i]['y'] += $t['y'];
					$bots[$i]['size'] += $t['size'];
					$index = array_search($t, $bots[$i]['vectors']);
					$bots[$i]['vectors'][$index]['x'] = $t['x'] / 1.14;
					$bots[$i]['vectors'][$index]['y'] = $t['y'] / 1.14;
					$bots[$i]['vectors'][$index]['size'] = $t['size'] / 1.14;
					if(($t['x'] < 2 && $t['y'] < 2) && ($t['x'] > -2 && $t['y'] > -2))
					{
						unset($bots[$i]['vectors'][$index]);
					}
				}
				$x = $bots[$i]['x'];
				$y = $bots[$i]['y'];
				$bots[$i]['size'] = min(max($bots[$i]['size'], 20), 129);
				if($x < 0 || $y < 0 || $x > $size || $y > $size)
				{
					$obrot = atan2($x - $size / 2, $y - $size / 2) * (1);
					$bots[$i]['vectors'][] = array('size' => 1, 'x' => sin($obrot) * -150, 'y' => cos($obrot) * -150);
				}
				if(count($bots[$i]['vectors']) < 1)
				{
					$bots[$i]['x'] += sin($bots[$i]['kierunek']) * $timeChange * 250 * 1.2222;
					$bots[$i]['y'] += cos($bots[$i]['kierunek']) * $timeChange * 250 * 1.2222;
				}
			}
		}
		if($allPlayers < $playersToWant)
		{
			$bots[] = array( 'size' => rand(20, 40), 'x' => $size / 2, 'y' => $size / 2, 'points' => 10, 'kierunek' => rand(0, 100) / 10, 'kierunekTo' => rand(0, 100) / 10, 'life' => true, 'vectors' => array(), 'look' => randomLook(), 'eat' => 0, 'name' => 'bot&nbsp' . createRandomName() );
		}
		//wysylanie wiadomosci
		for($i = 0; $i < count($clientSocketArray); $i ++)
		{
			if($clientSocketArray[$i][1]['life'] || $clientSocketArray[$i][1]['dieTimeEnd'] > $time)
			{
				$message = '';
				for($j = 0; $j < count($clientSocketArray); $j ++)
				{
					$thisPlayerLife = $clientSocketArray[$j][1]['life'];
					$subX = round(abs($clientSocketArray[$i][1]['x'] - $clientSocketArray[$j][1]['x']));
					$subY = round(abs($clientSocketArray[$i][1]['y'] - $clientSocketArray[$j][1]['y']));
					if($thisPlayerLife && ($subX < 1000) && ($subY < 1000))
					{
						$positionX = round($clientSocketArray[$i][1]['x'] - $clientSocketArray[$j][1]['x'] + 1000);
						$positionY = round($clientSocketArray[$i][1]['y'] - $clientSocketArray[$j][1]['y'] + 1000);

						$positionX = max(min($positionX, 2000), 0);
						$positionY = max(min($positionY, 2000), 0);

						$sizeThisPlayer = $clientSocketArray[$j][1]['size'] * 10;
						$rotateThisPlayer = $clientSocketArray[$j][1]['kierunek'] * -200;

						$message .= (chr(($positionX % 94) + 33)) . (chr(floor($positionX / 94) + 33));
						$message .= (chr(($positionY % 94) + 33)) . (chr(floor($positionY / 94) + 33));
						$message .= (chr(floor($sizeThisPlayer / 94) + 33));
						$message .= chr($clientSocketArray[$j][1]['look'] + 33);
						$message .= (chr(floor($rotateThisPlayer / 94) + 33));
						$message .= chr(round($clientSocketArray[$j][1]['kierunekTo'] * -7 + 33));
						$message .= (chr(($sizeThisPlayer % 94) + 33));
						$message .= (chr(($rotateThisPlayer % 94) + 33));
						$message .= (chr($clientSocketArray[$j][1]['antennae'] + 33));

						if($clientSocketArray[$j][1]['life'] && $clientSocketArray[$i][1]['life'] && $clientSocketArray[$j][1]['points'] != $clientSocketArray[$i][1]['points'] && CircleCollision($clientSocketArray[$j][1]['x'], $clientSocketArray[$j][1]['y'], $clientSocketArray[$j][1]['size'] * 2, $clientSocketArray[$i][1]['x'], $clientSocketArray[$i][1]['y'], $clientSocketArray[$i][1]['size'] * 2))
						{
							$v1x = sin($clientSocketArray[$i][1]['kierunek']);
							$v1y = cos($clientSocketArray[$i][1]['kierunek']);
							$v2x = sin($clientSocketArray[$j][1]['kierunek']);
							$v2y = cos($clientSocketArray[$j][1]['kierunek']);
							$jakkolwiekinaczejx = $clientSocketArray[$j][1]['x'] - $clientSocketArray[$i][1]['x'];
							$jakkolwiekinaczejy = $clientSocketArray[$j][1]['y'] - $clientSocketArray[$i][1]['y'];
							$jakkolwiekinaczejlength = sqrt($jakkolwiekinaczejx * $jakkolwiekinaczejx + $jakkolwiekinaczejy * $jakkolwiekinaczejy);
							$jakkolwiekinaczejx = $jakkolwiekinaczejx / $jakkolwiekinaczejlength;
							$jakkolwiekinaczejy = $jakkolwiekinaczejy / $jakkolwiekinaczejlength;

							$a2 = atan2($clientSocketArray[$j][1]['x'] - $clientSocketArray[$i][1]['x'], $clientSocketArray[$j][1]['y'] - $clientSocketArray[$i][1]['y']);
							$atan = atan2($clientSocketArray[$i][1]['x'] - $clientSocketArray[$j][1]['x'], $clientSocketArray[$i][1]['y'] - $clientSocketArray[$j][1]['y']);
							$r2 = $clientSocketArray[$j][1]['kierunek'];

							$delta = abs($v1x * $v2x + $v1y * $v2y);
							if(($v1x * $v2x + $v1y * $v2y >= 0) && ($v1x * $jakkolwiekinaczejx + $v1y * $jakkolwiekinaczejy >= 0)) {
								$delta = -$delta;
							}

							$totdelta = 0.0;
							foreach($clientSocketArray[$i][1]['vectors'] as $t) {
								$totdelta += $t['size'];
							}

							if(abs($totdelta) >= 1.2) {
								$delta *= 0.001;
							}
							$clientSocketArray[$i][1]['vectors'][] = array(
								'size' => $delta, 
								'x' => sin($clientSocketArray[$i][1]['kierunek']) * -30, 
								'y' => cos($clientSocketArray[$i][1]['kierunek']) * -30
							);
						}
					}
				}
				for($j = 0; $j < count($bots); $j++)
				{
					if($bots[$j]['life'] && abs($clientSocketArray[$i][1]['x'] - $bots[$j]['x']) < 1000 && abs($clientSocketArray[$i][1]['y'] - $bots[$j]['y']) < 1000)
					{
						$thisPlayerLife = $bots[$j]['life'];
						$subX = round(abs($clientSocketArray[$i][1]['x'] - $bots[$j]['x']));
						$subY = round(abs($clientSocketArray[$i][1]['y'] - $bots[$j]['y']));
						if($thisPlayerLife && ($subX < 1000) && ($subY < 1000))
						{
							$positionX = round($clientSocketArray[$i][1]['x'] - $bots[$j]['x'] + 1000);
							$positionY = round($clientSocketArray[$i][1]['y'] - $bots[$j]['y'] + 1000);

							$positionX = max(min($positionX, 2000), 0);
							$positionY = max(min($positionY, 2000), 0);

							$sizeThisPlayer = $bots[$j]['size'] * 10;
							$rotateThisPlayer = $bots[$j]['kierunek'] * -200;

							$message .= (chr(($positionX % 94) + 33)) . (chr(floor($positionX / 94) + 33));
							$message .= (chr(($positionY % 94) + 33)) . (chr(floor($positionY / 94) + 33));
							$message .= (chr(floor($sizeThisPlayer / 94) + 33));
							$message .= chr($bots[$j]['look'] + 33);
							$message .= (chr(floor($rotateThisPlayer / 94) + 33));
							$message .= chr(round($bots[$j]['kierunekTo'] * -7 + 33));
							$message .= (chr(($sizeThisPlayer % 94) + 33));
							$message .= (chr(($rotateThisPlayer % 94) + 33));
							$message .= chr(34);
						}

						if($bots[$j]['life'] && $clientSocketArray[$i][1]['life'] && $bots[$j]['points'] != $clientSocketArray[$i][1]['points'] && CircleCollision($bots[$j]['x'], $bots[$j]['y'], $bots[$j]['size'] * 2, $clientSocketArray[$i][1]['x'], $clientSocketArray[i][1]['y'], $clientSocketArray[$i][1]['size'] * 2))
						{
							$a2 = atan2($bots[$j]['x'] - $clientSocketArray[$i][1]['x'], $bots[$j]['y'] - $clientSocketArray[$i][1]['y']);
							$atan2 = atan2($clientSocketArray[$i][1]['x'] - $bots[$j]['x'], $clientSocketArray[$i][1]['y'] - $bots[$j]['y']);
							$r2 = $bots[$j]['kierunek'];
							$r1 = $clientSocketArray[$i][1]['kierunek'];
							echo "a2: $a2, atan2: $atan2, r2: $r2, r1: $r1";
							$bots[$j]['vectors'][] = array('size' => (abs($a2 - ($r2 * -1) % (pi() * 2)) % pi()) - pi() / -2, 'x' => sin($bots[$j]['kierunek']) * -30, 'y' => cos($bots[$j]['kierunek']) * -30);
							$clientSocketArray[$i][1]['vectors'][] = array('size' => (abs($a2 - ($r2 * -1) % (pi() * 2)) % pi()) - pi() / 2, 'x' => sin($clientSocketArray[$i][1]['kierunek']) * -30, 'y' => cos($clientSocketArray[$i][1]['kierunek']) * -30);
						}
					}
				}
				$message .= ' ';
				foreach($points as $point)
				{
					if(abs($clientSocketArray[$i][1]['x'] - $point['x']) < 1000 && abs($clientSocketArray[$i][1]['y'] - $point['y']) < 1000)
					{
						$positionX = round($clientSocketArray[$i][1]['x'] - $point['x'] + 1000);
						$positionY = round($clientSocketArray[$i][1]['y'] - $point['y'] + 1000);
						if(abs(($positionX - 1000)) < $clientSocketArray[$i][1]['size'] * 2.5)
						{
							if(abs(($positionY - 1000)) < $clientSocketArray[$i][1]['size'] * 2.5 && $clientSocketArray[$i][1]['life'])
							{
								if(count($points) < $size * $size / 100000)
								{
									$points[] = array('x' => rand($size * 0.1, $size * 0.9), 'y' => rand($size * 0.1, $size * 0.9));
								}
								unset($points[array_search($point, $points)]);
								$clientSocketArray[$i][1]['points'] += (rand(0, 30) / 10);
								$clientSocketArray[$i][1]['eat'] ++;
								$clientSocketArray[$i][1]['totalEaten'] ++;
							}
						}

						if($positionX < 2000 && $positionX > 0 && $positionY < 2000 && $positionY > 0)
						{
							$positionX = max(min($positionX, 1999), 1);
							$positionY = max(min($positionY, 1999), 1);
							if((($positionX % 94) + 33) > 126 || (($positionX % 94) + 33) < 33) 
							{
								echo 'err';
							}
							$message .= (chr(($positionX % 94) + 33)) . (chr(floor($positionX / 94) + 33));
							$message .= (chr(($positionY % 94) + 33)) . (chr(floor($positionY / 94) + 33));
						}
					}
				}
				$message .= ' ' . round($clientSocketArray[$i][1]['x'] - $rubinX) . '&' . round($clientSocketArray[$i][1]['y'] - $rubinY) . '&' . round($rubinHP);
				
				// if(rand(0, 7) == 3)
				if(true)
				{
					$message .= ' ';
					$rank = 0;
					$all = 0;
					$pointsOfPlayer = $clientSocketArray[$i][1]['points'];

					$leaderboardString = '';
					$leaders = array();
					$pointsOfPlayers = array();
					$nickNames = array();

					$room = $clientSocketArray[$i][1]['room'];
					$roomx = 50;
					$roomy = 50;
					foreach($clientSocketArray as $csae)
					{
						if($csae[1]['life'])
						{
							$pointsOfPlayers[] = $csae[1]['points'];
							$nickNames[] = $csae[1]['name'];

							$rank++;
							$all++;
							if($csae[1]['points'] < $pointsOfPlayer)
							{
								$rank--;
							}
							if($csae[1]['room'] == $room && $csae[1]['points'] != $pointsOfPlayer)
							{
								$roomx = round(($csae[1]['x'] / $size) * -100) + 100;
								$roomy = round(($csae[1]['y'] / $size) * -100) + 100;
							}
						}
					}
					foreach($bots as $csae)
					{
						if($csae['life'])
						{
							$pointsOfPlayers[] = $csae['points'];
							$nickNames[] = $csae['name'];

							$rank++;
							$all++;
							if($csae['points'] < $pointsOfPlayer)
							{
								$rank--;
							}
						}
					}
					$x = $clientSocketArray[$i][1]['x'] / $size;
					$y = $clientSocketArray[$i][1]['y'] / $size;

					$x = round($x * -100) + 100;
					$y = round($y * -100) + 100;

					$hasTheBestRank = false;

					//leaderboard
					$length = min(count($pointsOfPlayers), $leaderboardSize);
					for($elLB = 0; $elLB < $length; $elLB ++)
					{
						$index = array_search(max($pointsOfPlayers), $pointsOfPlayers);
						$leaders[] = array($pointsOfPlayers[$index], $nickNames[$index]);
						if(($nickNames[$index] == $clientSocketArray[$i][1]['name']) && ($pointsOfPlayers[$index] == $clientSocketArray[$i][1]['points']))
						{
							if($clientSocketArray[$i][1]['theBestRank'] > ($elLB + 1))
							{
								$clientSocketArray[$i][1]['theBestRank'] = ($elLB + 1);
								$hasTheBestRank = true;
							}
							$leaderboardString .= '<br/><b>' . ($elLB + 1) . '.' . toengnickname($nickNames[$index]) . '-' . round($pointsOfPlayers[$index]) . '</b>';
						} else {
							$leaderboardString .= '<br/>' . ($elLB + 1) . '.' . toengnickname($nickNames[$index]) . '-' . round($pointsOfPlayers[$index]);
						}
						
						unset($pointsOfPlayers[$index]);
						unset($nickNames[$index]);
					}

					//add to message
					$message .= 'points:' . round($pointsOfPlayer) . '<br/>all&nbsp;points:' . count($points) .'<br/>rank:' . $rank . '/' . $all . '<br/>' . $leaderboardString . ' ' . $x . ' ' . $y . ' ' . round($clientSocketArray[$i][1]['size'] * 100) . ' ' . $roomy . ($hasTheBestRank ? ' ' . $clientSocketArray[$i][1]['theBestRank'] : '');
				}

				if (isset($clientSocketArray[$i][1]['connected']) && $clientSocketArray[$i][1]['connected']) {
					$message = $wsstandard->seal($message, true);
					$messageLength = strlen($message);
					@socket_write($clientSocketArray[$i][0], $message, $messageLength);
				}
			}
		}
		$timeChange = 0;
	}
	if(rand(0, 300000) == 0)
	{
		//$life = false;
	}
}
socket_close($socketResource);
exit();