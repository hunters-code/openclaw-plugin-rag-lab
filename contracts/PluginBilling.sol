// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPluginsRegistry {
    struct Plugin {
        bytes32 id;
        string name;
        string version;
        address owner;
        string slug;
        string description;
        uint256 pricePerInstall;
        uint256 pricePerUsage;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    function getPlugin(bytes32 pluginId) external view returns (Plugin memory);
}

contract PluginBilling is ReentrancyGuard {
    IPluginsRegistry public immutable registry;

    mapping(bytes32 => uint256) public earnings;
    mapping(bytes32 => uint256) public installCount;
    mapping(bytes32 => uint256) public usageCount;

    event PluginInstalled(bytes32 indexed pluginId, address indexed user, uint256 charged);
    event PluginUsed(bytes32 indexed pluginId, address indexed user, string toolName, uint256 charged);
    event EarningsWithdrawn(bytes32 indexed pluginId, address indexed owner, uint256 amount);

    error PluginNotActive();
    error Underpaid(uint256 required, uint256 provided);
    error NotPluginOwner();
    error NothingToWithdraw();

    constructor(address registryAddress) {
        registry = IPluginsRegistry(registryAddress);
    }

    function recordInstall(bytes32 pluginId) external payable nonReentrant {
        IPluginsRegistry.Plugin memory plugin = registry.getPlugin(pluginId);
        if (!plugin.isActive) revert PluginNotActive();

        uint256 requiredPayment = plugin.pricePerInstall;
        if (msg.value < requiredPayment) revert Underpaid(requiredPayment, msg.value);

        earnings[pluginId] += msg.value;
        installCount[pluginId] += 1;

        emit PluginInstalled(pluginId, msg.sender, msg.value);
    }

    function recordUsage(bytes32 pluginId, string calldata toolName) external payable nonReentrant {
        IPluginsRegistry.Plugin memory plugin = registry.getPlugin(pluginId);
        if (!plugin.isActive) revert PluginNotActive();

        uint256 requiredPayment = plugin.pricePerUsage;
        if (msg.value < requiredPayment) revert Underpaid(requiredPayment, msg.value);

        earnings[pluginId] += msg.value;
        usageCount[pluginId] += 1;

        emit PluginUsed(pluginId, msg.sender, toolName, msg.value);
    }

    function withdraw(bytes32 pluginId) external nonReentrant {
        IPluginsRegistry.Plugin memory plugin = registry.getPlugin(pluginId);
        if (plugin.owner != msg.sender) revert NotPluginOwner();

        uint256 amount = earnings[pluginId];
        if (amount == 0) revert NothingToWithdraw();

        earnings[pluginId] = 0;

        (bool ok, ) = payable(plugin.owner).call{value: amount}("");
        require(ok);

        emit EarningsWithdrawn(pluginId, plugin.owner, amount);
    }
}

