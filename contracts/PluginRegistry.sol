// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PluginsRegistry
 * @notice On-chain registry for plugins in the SkillWeave ecosystem.
 *         Each plugin is uniquely identified by keccak256(name, version, owner).
 */
contract PluginsRegistry is Ownable, ReentrancyGuard {
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

    uint256 public constant MAX_NAME_LENGTH = 64;

    /// @dev pluginId => Plugin
    mapping(bytes32 => Plugin) private _plugins;

    /// @dev owner address => list of pluginIds
    mapping(address => bytes32[]) private _ownerPlugins;

    // --------------- Events ---------------

    event PluginRegistered(
        bytes32 indexed pluginId,
        address indexed owner,
        string name,
        string version
    );
    event PluginUpdated(bytes32 indexed pluginId);
    event PluginDeactivated(bytes32 indexed pluginId);

    // --------------- Errors ---------------

    error EmptyName();
    error NameTooLong();
    error EmptyVersion();
    error EmptySlug();
    error PluginAlreadyRegistered(bytes32 pluginId);
    error PluginNotFound(bytes32 pluginId);
    error NotPluginOwner();
    error PluginNotActive();

    // --------------- Constructor ---------------

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --------------- External functions ---------------

    /**
     * @notice Register a new plugin.
     * @param name        Human-readable plugin name (max 64 bytes).
     * @param version     Semantic version string (e.g. "1.0.0").
     * @param slug        Clawhub plugin slug (e.g. "my-plugin-name").
     * @param description Short description of the plugin.
     * @return pluginId   keccak256(name, version, msg.sender)
     */
    function registerPlugin(
        string calldata name,
        string calldata version,
        string calldata slug,
        string calldata description,
        uint256 pricePerInstall,
        uint256 pricePerUsage
    ) external nonReentrant returns (bytes32 pluginId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(name).length > MAX_NAME_LENGTH) revert NameTooLong();
        if (bytes(version).length == 0) revert EmptyVersion();
        if (bytes(slug).length == 0) revert EmptySlug();

        pluginId = keccak256(abi.encode(name, version, msg.sender));

        if (_plugins[pluginId].createdAt != 0) revert PluginAlreadyRegistered(pluginId);

        _plugins[pluginId] = Plugin({
            id: pluginId,
            name: name,
            version: version,
            owner: msg.sender,
            slug: slug,
            description: description,
            pricePerInstall: pricePerInstall,
            pricePerUsage: pricePerUsage,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _ownerPlugins[msg.sender].push(pluginId);

        emit PluginRegistered(pluginId, msg.sender, name, version);
    }

    /**
     * @notice Update a plugin's mutable fields. Only the plugin owner may call this.
     *         The plugin must be active.
     */
    function updatePlugin(
        bytes32 pluginId,
        string calldata slug,
        string calldata description
    ) external {
        Plugin storage plugin = _plugins[pluginId];
        if (plugin.createdAt == 0) revert PluginNotFound(pluginId);
        if (plugin.owner != msg.sender) revert NotPluginOwner();
        if (!plugin.isActive) revert PluginNotActive();
        if (bytes(slug).length == 0) revert EmptySlug();

        plugin.slug = slug;
        plugin.description = description;
        plugin.updatedAt = block.timestamp;

        emit PluginUpdated(pluginId);
    }

    /**
     * @notice Permanently deactivate a plugin. Only the plugin owner may call this.
     *         Deactivated plugins cannot be updated but can still be queried.
     */
    function deactivatePlugin(bytes32 pluginId) external {
        Plugin storage plugin = _plugins[pluginId];
        if (plugin.createdAt == 0) revert PluginNotFound(pluginId);
        if (plugin.owner != msg.sender) revert NotPluginOwner();

        plugin.isActive = false;
        plugin.updatedAt = block.timestamp;

        emit PluginDeactivated(pluginId);
    }

    // --------------- View functions ---------------

    /**
     * @notice Retrieve the full Plugin struct by pluginId.
     */
    function getPlugin(bytes32 pluginId) external view returns (Plugin memory) {
        if (_plugins[pluginId].createdAt == 0) revert PluginNotFound(pluginId);
        return _plugins[pluginId];
    }

    /**
     * @notice Returns true if a plugin with the given id has been registered.
     */
    function isRegistered(bytes32 pluginId) external view returns (bool) {
        return _plugins[pluginId].createdAt != 0;
    }

    /**
     * @notice Returns the list of pluginIds registered by a given owner address.
     */
    function getPluginsByOwner(address owner) external view returns (bytes32[] memory) {
        return _ownerPlugins[owner];
    }
}
